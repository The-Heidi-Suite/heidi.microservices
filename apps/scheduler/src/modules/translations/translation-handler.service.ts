import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { TranslationService } from '@heidi/translations';
import { LoggerService } from '@heidi/logger';
import { RabbitMQPatterns } from '@heidi/rabbitmq';
import { AutoTranslateFieldDto } from '@heidi/contracts';

@Controller()
export class TranslationHandlerService {
  private readonly logger: LoggerService;

  constructor(
    private readonly translationService: TranslationService,
    logger: LoggerService,
  ) {
    this.logger = logger;
    this.logger.setContext(TranslationHandlerService.name);
  }

  @EventPattern(RabbitMQPatterns.TRANSLATION_AUTO_TRANSLATE)
  async handleAutoTranslate(@Payload() data: AutoTranslateFieldDto) {
    this.logger.log(
      `Processing auto-translate job: ${data.entityType}/${data.entityId}/${data.field} to ${data.targetLocales.join(', ')}`,
    );

    try {
      await this.translationService.autoTranslate(
        data.entityType,
        data.entityId,
        data.field,
        data.sourceLocale,
        data.targetLocales,
        data.text,
        data.sourceHash,
      );

      this.logger.log(
        `Successfully translated ${data.entityType}/${data.entityId}/${data.field} to ${data.targetLocales.join(', ')}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to auto-translate ${data.entityType}/${data.entityId}/${data.field}: ${error?.message}`,
        error,
      );
      // Don't throw - allow message to be acknowledged even on failure
      // The translation service will log the error
    }
  }
}
