import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';
import { PrismaNotificationModule } from '@heidi/prisma';
import { LoggerModule } from '@heidi/logger';
import { RabbitMQModule } from '@heidi/rabbitmq';
import { MetricsModule, MetricsInterceptor } from '@heidi/metrics';
import { LoggingInterceptor } from '@heidi/interceptors';
import { I18nModule, LanguageInterceptor } from '@heidi/i18n';
import { NotificationModule } from './modules/notification/notification.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TerminusModule,
    PrismaNotificationModule,
    LoggerModule,
    RabbitMQModule.register(),
    MetricsModule,
    I18nModule,
    NotificationModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: LanguageInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
  ],
})
export class AppModule {}
