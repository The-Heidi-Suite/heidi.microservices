import { Injectable, Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@heidi/config';
import { LoggerService } from '@heidi/logger';
import { I18nService } from '@heidi/i18n';
import { RABBITMQ_CLIENT, RabbitMQPatterns, RmqClientWrapper } from '@heidi/rabbitmq';
import { DatabaseProvider } from './providers/database.provider';
import { DeepLProvider } from './providers/deepl.provider';
import { ITranslationProvider } from './providers/translation-provider.interface';
import { TranslationSource } from './interfaces/translation.types';
import { RateLimitError } from './errors/rate-limit.error';
import { createHash } from 'crypto';

/**
 * Simple concurrency limiter using semaphore pattern
 */
class ConcurrencyLimiter {
  private running = 0;
  private queue: Array<() => void> = [];

  constructor(private readonly limit: number) {}

  async acquire(): Promise<void> {
    if (this.running < this.limit) {
      this.running++;
      return;
    }

    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    this.running--;
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) {
        this.running++;
        next();
      }
    }
  }
}

@Injectable()
export class TranslationService {
  private readonly defaultSourceLocale: string;
  private readonly autoTranslateOnRead: boolean;
  private readonly supportedLocales: string[];
  private readonly concurrencyLimiter: ConcurrencyLimiter;

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseProvider: DatabaseProvider,
    private readonly deeplProvider: DeepLProvider,
    private readonly logger: LoggerService,
    @Optional() private readonly i18nService?: I18nService,
    @Optional() @Inject(RABBITMQ_CLIENT) private readonly rmqClient?: RmqClientWrapper,
  ) {
    this.defaultSourceLocale = this.configService.translationsDefaultSourceLocale;
    this.autoTranslateOnRead = this.configService.translationsAutoTranslateOnRead;
    this.supportedLocales = this.configService.get<string[]>('i18n.supportedLanguages') || [
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
    ];

    const maxConcurrent = parseInt(
      this.configService.get<string>('translations.maxConcurrent', '3'),
      10,
    );
    this.concurrencyLimiter = new ConcurrencyLimiter(maxConcurrent);

    this.logger.setContext(TranslationService.name);
  }

  /**
   * Compute hash of source text for change detection
   */
  private computeSourceHash(text: string): string {
    return createHash('sha256').update(text).digest('hex');
  }

  /**
   * Translate a key (for UI/notification messages)
   * Falls back to I18nService if translation not found in database
   */
  async translate(key: string, locale: string, params?: Record<string, any>): Promise<string> {
    // First try database translation
    const dbTranslation = await this.databaseProvider.findByKeyAndLocale(key, locale);
    if (dbTranslation) {
      // Interpolate parameters if provided
      if (params) {
        return this.interpolate(dbTranslation.value, params);
      }
      return dbTranslation.value;
    }

    // Fall back to I18nService if available
    if (this.i18nService) {
      const i18nTranslation = this.i18nService.translate(key, params, locale);
      if (i18nTranslation !== key) {
        return i18nTranslation;
      }
    }

    // Final fallback to default language via I18nService
    if (this.i18nService && locale !== this.defaultSourceLocale) {
      return this.i18nService.translate(key, params, this.defaultSourceLocale);
    }

    return key;
  }

  /**
   * Get translation for an entity field
   * Returns default language text if translation not found, and optionally triggers auto-translate
   * @param sourceLocale - Optional source language of the entity. If not provided, uses defaultSourceLocale.
   */
  async getTranslation(
    entityType: string,
    entityId: string,
    field: string,
    locale: string,
    sourceText?: string,
    sourceLocale?: string,
  ): Promise<string> {
    // Try to find translation
    const translation = await this.databaseProvider.findByEntityAndLocale(
      entityType,
      entityId,
      field,
      locale,
    );

    if (translation) {
      return translation.value;
    }

    // Translation not found - return default language text
    // If sourceText is provided, use it; otherwise caller should fetch from entity
    const defaultText = sourceText || '';

    // Determine source locale: use provided, or fall back to default
    const effectiveSourceLocale = sourceLocale || this.defaultSourceLocale;

    // Trigger auto-translate on-read if enabled and source text is available
    if (this.autoTranslateOnRead && defaultText && locale !== effectiveSourceLocale) {
      // Publish job to scheduler for async translation
      if (this.rmqClient) {
        const sourceHash = this.computeSourceHash(defaultText);
        try {
          this.rmqClient.emit(RabbitMQPatterns.TRANSLATION_AUTO_TRANSLATE, {
            entityType,
            entityId,
            field,
            sourceLocale: effectiveSourceLocale,
            targetLocales: [locale],
            text: defaultText,
            sourceHash,
          });
        } catch (error) {
          // Log but don't throw - this is fire-and-forget
          this.logger.error('Failed to publish auto-translate job', error);
        }
      }
    }

    return defaultText;
  }

  /**
   * Save a translation manually
   */
  async saveTranslation(
    entityType: string,
    entityId: string,
    field: string,
    locale: string,
    value: string,
    sourceLocale?: string,
    sourceHash?: string,
    source: TranslationSource = TranslationSource.MANUAL,
  ): Promise<void> {
    await this.databaseProvider.upsertTranslation({
      entityType,
      entityId,
      field,
      locale,
      value,
      sourceLocale: sourceLocale || this.defaultSourceLocale,
      sourceHash,
      source,
    });
  }

  /**
   * Auto-translate entity field to multiple target locales
   * Skips translation if sourceHash matches existing translation
   */
  async autoTranslate(
    entityType: string,
    entityId: string,
    field: string,
    sourceLocale: string,
    targetLocales: string[],
    text: string,
    sourceHash?: string,
  ): Promise<void> {
    if (!text || text.trim().length === 0) {
      return;
    }

    const computedHash = sourceHash || this.computeSourceHash(text);
    const provider: ITranslationProvider = this.deeplProvider;

    // Filter out locales that already have matching translations
    const localesToTranslate: string[] = [];
    for (const targetLocale of targetLocales) {
      if (targetLocale === sourceLocale) {
        continue; // Skip same locale
      }

      const hasMatchingHash = await this.databaseProvider.hasTranslationWithHash(
        entityType,
        entityId,
        field,
        targetLocale,
        computedHash,
      );

      if (!hasMatchingHash) {
        localesToTranslate.push(targetLocale);
      }
    }

    if (localesToTranslate.length === 0) {
      return; // All translations already exist with matching hash
    }

    try {
      // Translate each target locale separately with concurrency control
      const translationPromises = localesToTranslate.map(async (targetLocale) => {
        // Acquire concurrency slot
        await this.concurrencyLimiter.acquire();

        try {
          const translatedText = await provider.translate(text, targetLocale, sourceLocale);

          await this.databaseProvider.upsertTranslation({
            entityType,
            entityId,
            field,
            locale: targetLocale,
            value: translatedText,
            sourceLocale,
            sourceHash: computedHash,
            source: TranslationSource.AUTO_DEEPL,
            metadata: {
              provider: 'deepl',
              translatedAt: new Date().toISOString(),
            },
          });
        } catch (error: any) {
          // Log individual locale failure but continue with others
          // Re-throw RateLimitError so it can be handled by the caller for requeue
          if (error instanceof RateLimitError) {
            this.logger.warn(
              `Auto-translate rate limited for ${entityType}/${entityId}/${field} to ${targetLocale}`,
            );
            throw error; // Re-throw rate limit errors
          }

          this.logger.error(
            `Auto-translate failed for ${entityType}/${entityId}/${field} to ${targetLocale}`,
            error,
          );
          // Don't throw for non-rate-limit errors - continue with other locales
        } finally {
          // Always release concurrency slot
          this.concurrencyLimiter.release();
        }
      });

      // Wait for all translations to complete and check for rate limit errors
      const results = await Promise.allSettled(translationPromises);
      const rateLimitErrors = results
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .filter((result) => result.reason instanceof RateLimitError);

      if (rateLimitErrors.length > 0) {
        // Re-throw the first rate limit error so caller can requeue
        throw rateLimitErrors[0].reason;
      }
    } catch (error: any) {
      // Re-throw rate limit errors for requeue handling
      if (error instanceof RateLimitError) {
        throw error;
      }

      // Log other errors but don't throw - allow partial success
      this.logger.error(`Auto-translate failed for ${entityType}/${entityId}/${field}`, error);
      throw error; // Re-throw to allow caller to handle
    }
  }

  /**
   * Interpolate parameters in translation string
   */
  private interpolate(translation: string, params: Record<string, any>): string {
    let result = translation;
    for (const [key, value] of Object.entries(params)) {
      const placeholder = new RegExp(`\\{${key}\\}`, 'g');
      result = result.replace(placeholder, String(value));
    }
    return result;
  }
}
