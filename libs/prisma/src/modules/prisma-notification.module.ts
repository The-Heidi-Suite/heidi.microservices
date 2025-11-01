import { Global, Module } from '@nestjs/common';
import { LoggerModule } from '@heidi/logger';
import { ConfigModule } from '@heidi/config';
import { PrismaNotificationService } from '../services/prisma-notification.service';

@Global()
@Module({
  imports: [LoggerModule, ConfigModule],
  providers: [PrismaNotificationService],
  exports: [PrismaNotificationService],
})
export class PrismaNotificationModule {}
