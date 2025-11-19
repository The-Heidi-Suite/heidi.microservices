import { Module } from '@nestjs/common';
import { CoreController } from './core.controller';
import { CoreMessageController } from './core-message.controller';
import { CoreService } from './core.service';
import { LoggerModule } from '@heidi/logger';
import { PrismaCoreModule } from '@heidi/prisma';
import { TranslationModule } from '@heidi/translations';
import { ConfigModule } from '@heidi/config';

@Module({
  imports: [LoggerModule, PrismaCoreModule, TranslationModule, ConfigModule], // For message controller logging
  controllers: [CoreController, CoreMessageController],
  providers: [CoreService],
})
export class CoreModule {}
