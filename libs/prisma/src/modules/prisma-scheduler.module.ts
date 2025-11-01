import { Global, Module } from '@nestjs/common';
import { LoggerModule } from '@heidi/logger';
import { ConfigModule } from '@heidi/config';
import { PrismaSchedulerService } from '../services/prisma-scheduler.service';

@Global()
@Module({
  imports: [LoggerModule, ConfigModule],
  providers: [PrismaSchedulerService],
  exports: [PrismaSchedulerService],
})
export class PrismaSchedulerModule {}
