import { Module } from '@nestjs/common';
import { TranslationModule } from '@heidi/translations';
import { LoggerModule } from '@heidi/logger';
import { TranslationHandlerService } from './translation-handler.service';

@Module({
  imports: [TranslationModule, LoggerModule],
  controllers: [TranslationHandlerService],
})
export class TranslationsModule {}
