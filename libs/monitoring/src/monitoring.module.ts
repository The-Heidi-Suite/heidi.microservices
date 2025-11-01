import { Module, Global } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@heidi/config';
import { LoggerModule } from '@heidi/logger';
import { HealthModule } from '@heidi/health';
import { ErrorHandlingModule } from '@heidi/errors';
import {
  PrismaAuthModule,
  PrismaUsersModule,
  PrismaCityModule,
  PrismaCoreModule,
  PrismaNotificationModule,
  PrismaSchedulerModule,
  PrismaIntegrationModule,
} from '@heidi/prisma';
import { MonitoringService } from './monitoring.service';
import { AlertingService } from './alerting.service';

@Global()
@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    ScheduleModule.forRoot(),
    HealthModule,
    ErrorHandlingModule,
    // Import all Prisma modules - they are @Global() so will be available across the app
    // Services that don't exist in a microservice will gracefully fail with @Optional()
    PrismaAuthModule,
    PrismaUsersModule,
    PrismaCityModule,
    PrismaCoreModule,
    PrismaNotificationModule,
    PrismaSchedulerModule,
    PrismaIntegrationModule,
  ],
  providers: [MonitoringService, AlertingService],
  exports: [MonitoringService, AlertingService],
})
export class MonitoringModule {}
