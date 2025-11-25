import { Module } from '@nestjs/common';
import { TranslationModule } from '@heidi/translations';
import { LoggerModule } from '@heidi/logger';
import { ConfigModule } from '@heidi/config';
import { RmqModule } from '@heidi/rabbitmq';
import { TranslationHandlerService } from './translation-handler.service';

@Module({
  imports: [TranslationModule, LoggerModule, ConfigModule, RmqModule],
  controllers: [TranslationHandlerService],
})
export class TranslationsModule {}
