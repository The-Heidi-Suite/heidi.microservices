import { Module, Global } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@heidi/config';
import { LoggerModule } from '@heidi/logger';
import { PrismaModule } from '@heidi/prisma';
import { HealthModule } from '@heidi/health';
import { ErrorHandlingModule } from '@heidi/errors';
import { MonitoringService } from './monitoring.service';
import { AlertingService } from './alerting.service';

@Global()
@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    PrismaModule,
    ScheduleModule.forRoot(),
    HealthModule,
    ErrorHandlingModule,
  ],
  providers: [MonitoringService, AlertingService],
  exports: [MonitoringService, AlertingService],
})
export class MonitoringModule {}
