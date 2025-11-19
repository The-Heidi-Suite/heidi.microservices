import { Global, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@heidi/config';
import { LoggerModule } from '@heidi/logger';
import { PrismaCoreModule } from '@heidi/prisma';
import { I18nModule } from '@heidi/i18n';
import { RmqModule } from '@heidi/rabbitmq';
import { TranslationService } from './translation.service';
import { DatabaseProvider } from './providers/database.provider';
import { DeepLProvider } from './providers/deepl.provider';

@Global()
@Module({
  imports: [ConfigModule, LoggerModule, HttpModule, PrismaCoreModule, I18nModule, RmqModule],
  providers: [TranslationService, DatabaseProvider, DeepLProvider],
  exports: [TranslationService, DatabaseProvider, DeepLProvider],
})
export class TranslationModule {}
