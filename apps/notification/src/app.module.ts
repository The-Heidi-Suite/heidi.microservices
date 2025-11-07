import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';
import { ConfigModule, ConfigService } from '@heidi/config';
import { PrismaNotificationModule } from '@heidi/prisma';
import { LoggerModule } from '@heidi/logger';
import { RmqModule } from '@heidi/rabbitmq';
import { MetricsModule, MetricsInterceptor } from '@heidi/metrics';
import { LoggingInterceptor } from '@heidi/interceptors';
import { I18nModule, LanguageInterceptor } from '@heidi/i18n';
import { TermsAcceptanceGuard } from '@heidi/rbac';
import { NotificationModule } from './modules/notification/notification.module';
import { VerificationModule } from './modules/verification/verification.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule,
    TerminusModule,
    PrismaNotificationModule,
    LoggerModule,
    RmqModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: () => ({ serviceName: 'notification' }),
    }),
    MetricsModule,
    I18nModule,
    NotificationModule,
    VerificationModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: LanguageInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
    {
      provide: APP_GUARD,
      useClass: TermsAcceptanceGuard,
    },
  ],
})
export class AppModule {}
