import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@heidi/config';
import { LoggerService } from '@heidi/logger';
import { firstValueFrom } from 'rxjs';
import { ITranslationProvider } from './translation-provider.interface';

interface DeepLTranslationResponse {
  translations: Array<{
    detected_source_language: string;
    text: string;
  }>;
}

/**
 * Language code mapping from internal codes to DeepL API codes
 */
const DEEPL_LANGUAGE_MAP: Record<string, string> = {
  de: 'DE',
  en: 'EN',
  dk: 'DA', // Danish
  no: 'NB', // Norwegian Bokmål
  se: 'SV', // Swedish
  ar: 'AR',
  fa: 'FA',
  tr: 'TR',
  ru: 'RU',
  uk: 'UK',
};

@Injectable()
export class DeepLProvider implements ITranslationProvider {
  private readonly logger: LoggerService;
  private readonly apiKey: string;
  private readonly apiUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly http: HttpService,
    logger: LoggerService,
  ) {
    this.logger = logger;
    this.logger.setContext(DeepLProvider.name);

    this.apiKey = this.configService.get<string>('translations.deepl.apiKey', '');
    this.apiUrl =
      this.configService.get<string>('translations.deepl.apiUrl') ||
      'https://api-free.deepl.com/v2/translate';

    if (!this.apiKey) {
      this.logger.warn('DeepL API key not configured. Translation provider will fail.');
    }
  }

  /**
   * Map internal language code to DeepL language code
   */
  private mapLanguageCode(locale: string): string {
    const mapped = DEEPL_LANGUAGE_MAP[locale.toLowerCase()];
    if (!mapped) {
      this.logger.warn(`Unsupported language code for DeepL: ${locale}, using as-is`);
      return locale.toUpperCase();
    }
    return mapped;
  }

  /**
   * Translate a single text string
   */
  async translate(text: string, targetLocale: string, sourceLocale?: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('DeepL API key is not configured');
    }

    const targetLang = this.mapLanguageCode(targetLocale);
    const sourceLang = sourceLocale ? this.mapLanguageCode(sourceLocale) : undefined;

    try {
      const params = new URLSearchParams({
        auth_key: this.apiKey,
        text,
        target_lang: targetLang,
      });

      if (sourceLang) {
        params.append('source_lang', sourceLang);
      }

      const response = await firstValueFrom(
        this.http.post<DeepLTranslationResponse>(this.apiUrl, params, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 30000,
        }),
      );

      if (response.data.translations && response.data.translations.length > 0) {
        return response.data.translations[0].text;
      }

      throw new Error('No translation returned from DeepL API');
    } catch (error: any) {
      this.logger.error(`DeepL translation failed: ${error?.message}`, error?.stack);
      throw new Error(`DeepL translation failed: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Translate multiple texts in a single batch to the same target locale
   */
  async translateBatch(
    texts: string[],
    targetLocale: string,
    sourceLocale?: string,
  ): Promise<string[]> {
    if (!this.apiKey) {
      throw new Error('DeepL API key is not configured');
    }

    if (texts.length === 0) {
      return [];
    }

    const targetLang = this.mapLanguageCode(targetLocale);
    const sourceLang = sourceLocale ? this.mapLanguageCode(sourceLocale) : undefined;

    try {
      const params = new URLSearchParams({
        auth_key: this.apiKey,
        target_lang: targetLang,
      });

      // Add all texts as separate parameters (DeepL supports multiple text parameters)
      texts.forEach((text) => {
        params.append('text', text);
      });

      if (sourceLang) {
        params.append('source_lang', sourceLang);
      }

      const response = await firstValueFrom(
        this.http.post<DeepLTranslationResponse>(this.apiUrl, params, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 30000,
        }),
      );

      if (response.data.translations && response.data.translations.length === texts.length) {
        return response.data.translations.map((t) => t.text);
      }

      throw new Error(
        `Expected ${texts.length} translations, got ${response.data.translations?.length || 0}`,
      );
    } catch (error: any) {
      this.logger.error(`DeepL batch translation failed: ${error?.message}`, error?.stack);
      throw new Error(`DeepL batch translation failed: ${error?.message || 'Unknown error'}`);
    }
  }
}
