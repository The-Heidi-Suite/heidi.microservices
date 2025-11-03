import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface LanguagePreference {
  language: string;
  quality: number;
}

@Injectable()
export class LanguageDetectorService {
  private readonly defaultLanguage: string;
  private readonly supportedLanguages: string[];

  constructor(private readonly configService: ConfigService) {
    this.defaultLanguage =
      this.configService.get<string>('i18n.defaultLanguage') ||
      process.env.I18N_DEFAULT_LANGUAGE ||
      'en';
    this.supportedLanguages =
      this.configService.get<string[]>('i18n.supportedLanguages') ||
      process.env.I18N_SUPPORTED_LANGUAGES?.split(',') ||
      ['de', 'en', 'dk', 'no', 'se', 'ar', 'fa', 'tr', 'ru', 'uk'];
  }

  /**
   * Detect language from Accept-Language header
   * Follows RFC 7231 specification
   * @param acceptLanguageHeader Accept-Language header value (e.g., "en-US,en;q=0.9,de;q=0.8")
   * @returns Detected language code or default language
   */
  detectLanguage(acceptLanguageHeader?: string): string {
    if (!acceptLanguageHeader || acceptLanguageHeader.trim() === '') {
      return this.defaultLanguage;
    }

    try {
      const preferences = this.parseAcceptLanguage(acceptLanguageHeader);
      const detected = this.matchLanguage(preferences);

      // Validate detected language is supported
      if (this.supportedLanguages.includes(detected)) {
        return detected;
      }

      return this.defaultLanguage;
    } catch (error) {
      // On any parsing error, return default
      return this.defaultLanguage;
    }
  }

  /**
   * Parse Accept-Language header into prioritized list
   * @param header Accept-Language header value
   * @returns Array of language preferences sorted by quality
   */
  private parseAcceptLanguage(header: string): LanguagePreference[] {
    const preferences: LanguagePreference[] = [];

    // Split by comma
    const parts = header.split(',').map((part) => part.trim());

    for (const part of parts) {
      const [langTag, qValue] = part.split(';').map((p) => p.trim());

      // Extract base language code (e.g., 'en' from 'en-US')
      const baseLanguage = this.extractBaseLanguage(langTag);

      // Parse quality value (default to 1.0 if not specified)
      const quality = qValue ? parseFloat(qValue.replace('q=', '')) : 1.0;

      preferences.push({
        language: baseLanguage.toLowerCase(),
        quality: isNaN(quality) ? 1.0 : Math.max(0, Math.min(1, quality)),
      });
    }

    // Sort by quality (highest first)
    return preferences.sort((a, b) => b.quality - a.quality);
  }

  /**
   * Extract base language code from language tag
   * @param langTag Language tag (e.g., 'en-US', 'de-DE', 'en')
   * @returns Base language code (e.g., 'en', 'de')
   */
  private extractBaseLanguage(langTag: string): string {
    // Remove any whitespace and take the part before hyphen
    const base = langTag.split('-')[0].toLowerCase();
    return base || langTag.toLowerCase();
  }

  /**
   * Match language preferences to supported languages
   * @param preferences Prioritized list of language preferences
   * @returns Best matching language code
   */
  private matchLanguage(preferences: LanguagePreference[]): string {
    // Try to find exact match first
    for (const pref of preferences) {
      if (this.supportedLanguages.includes(pref.language)) {
        return pref.language;
      }
    }

    // Fallback to default
    return this.defaultLanguage;
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    return [...this.supportedLanguages];
  }

  /**
   * Check if language is supported
   */
  isLanguageSupported(language: string): boolean {
    return this.supportedLanguages.includes(language.toLowerCase());
  }
}
