import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@heidi/config';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { i18nAsyncLocalStorage } from './i18n-async-storage';
import { TranslationFile } from './interfaces/translation.interface';

@Injectable()
export class I18nService implements OnModuleInit {
  private translations: Map<string, TranslationFile> = new Map();
  private readonly defaultLanguage: string;
  private readonly translationsPath: string;

  constructor(private readonly configService: ConfigService) {
    this.defaultLanguage = this.configService.get<string>('i18n.defaultLanguage', 'en');
    // Translations path - check both production (dist) and development (src) locations
    const distPath = join(__dirname, 'translations');
    const srcPath = join(process.cwd(), 'libs', 'i18n', 'src', 'translations');

    // Use dist path if it exists (production), otherwise use src path (development)
    this.translationsPath = existsSync(distPath) ? distPath : srcPath;
  }

  async onModuleInit() {
    await this.loadTranslations();
  }

  /**
   * Load all translation files from the translations directory
   */
  private async loadTranslations(): Promise<void> {
    const supportedLanguages = this.getSupportedLanguages();

    for (const lang of supportedLanguages) {
      try {
        const errorsPath = join(this.translationsPath, lang, 'errors.json');
        const validationPath = join(this.translationsPath, lang, 'validation.json');
        const successPath = join(this.translationsPath, lang, 'success.json');
        const emailsPath = join(this.translationsPath, lang, 'emails.json');
        const notificationsPath = join(this.translationsPath, lang, 'notifications.json');

        const errorsData = this.loadJsonFile(errorsPath);
        const validationData = this.loadJsonFile(validationPath);
        const successData = this.loadJsonFile(successPath);
        const emailsData = this.loadJsonFile(emailsPath);
        const notificationsData = this.loadJsonFile(notificationsPath);

        this.translations.set(`${lang}:errors`, errorsData);
        this.translations.set(`${lang}:validation`, validationData);
        this.translations.set(`${lang}:success`, successData);
        this.translations.set(`${lang}:emails`, emailsData);
        this.translations.set(`${lang}:notifications`, notificationsData);
      } catch (error) {
        console.warn(
          `Failed to load translations for language '${lang}':`,
          error instanceof Error ? error.message : error,
        );
      }
    }
  }

  /**
   * Load JSON file synchronously
   */
  private loadJsonFile(filePath: string): TranslationFile {
    try {
      const content = readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File not found, return empty object
        return {};
      }
      throw error;
    }
  }

  /**
   * Translate a key with optional parameters
   * @param key Translation key in format "errors.ERROR_CODE" or "validation.key"
   * @param params Optional parameters for interpolation (e.g., { field: 'email', min: 6 })
   * @param language Optional language override
   * @returns Translated string or key if translation not found
   */
  translate(key: string, params?: Record<string, any>, language?: string): string {
    const lang = language || this.getLanguage();
    const [namespace, ...keyParts] = key.split('.');

    if (!namespace || keyParts.length === 0) {
      return key;
    }

    // Try requested language first
    let translation = this.getTranslation(lang, namespace, keyParts);

    // Fallback to default language if translation not found
    if (!translation && lang !== this.defaultLanguage) {
      translation = this.getTranslation(this.defaultLanguage, namespace, keyParts);
    }

    // If still not found, return the key
    if (!translation) {
      return key;
    }

    // Interpolate parameters
    return this.interpolate(translation, params);
  }

  /**
   * Get translation from loaded translations
   */
  private getTranslation(language: string, namespace: string, keyParts: string[]): string | null {
    const translationKey = `${language}:${namespace}`;
    const translationFile = this.translations.get(translationKey);

    if (!translationFile) {
      return null;
    }

    // Navigate nested keys (e.g., "errors.INTERNAL_SERVER_ERROR")
    let value: any = translationFile;
    for (const part of keyParts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return null;
      }
    }

    return typeof value === 'string' ? value : null;
  }

  /**
   * Interpolate parameters in translation string
   * @param translation Translation string with placeholders (e.g., "{field} is required")
   * @param params Parameters to substitute
   * @returns Interpolated string
   */
  private interpolate(translation: string, params?: Record<string, any>): string {
    if (!params) {
      return translation;
    }

    let result = translation;
    for (const [key, value] of Object.entries(params)) {
      const placeholder = new RegExp(`\\{${key}\\}`, 'g');
      result = result.replace(placeholder, String(value));
    }

    return result;
  }

  /**
   * Get current language from AsyncLocalStorage
   */
  getLanguage(): string {
    const context = i18nAsyncLocalStorage.getStore();
    return context?.language || this.defaultLanguage;
  }

  /**
   * Get current locale from AsyncLocalStorage
   */
  getLocale(): string | undefined {
    const context = i18nAsyncLocalStorage.getStore();
    return context?.locale;
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    return (
      this.configService.get<string[]>('i18n.supportedLanguages') || [
        'de',
        'en',
        'dk',
        'no',
        'se',
        'ar',
        'fa',
        'tr',
        'ru',
        'uk',
      ]
    );
  }
}
