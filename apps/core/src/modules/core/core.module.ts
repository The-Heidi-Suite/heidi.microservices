import { Module } from '@nestjs/common';
import { CoreController } from './core.controller';
import { CoreMessageController } from './core-message.controller';
import { CoreService } from './core.service';
import { LoggerModule } from '@heidi/logger';
import { PrismaCoreModule } from '@heidi/prisma';

@Module({
  imports: [LoggerModule, PrismaCoreModule], // For message controller logging
  controllers: [CoreController, CoreMessageController],
  providers: [CoreService],
})
export class CoreModule {}
