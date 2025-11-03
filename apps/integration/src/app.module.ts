import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { HttpModule } from '@nestjs/axios';
import { TerminusModule } from '@nestjs/terminus';
import { ConfigModule } from '@heidi/config';
import { PrismaIntegrationModule } from '@heidi/prisma';
import { LoggerModule } from '@heidi/logger';
import { RabbitMQModule } from '@heidi/rabbitmq';
import { MetricsModule, MetricsInterceptor } from '@heidi/metrics';
import { LoggingInterceptor } from '@heidi/interceptors';
import { I18nModule, LanguageInterceptor } from '@heidi/i18n';
import { IntegrationModule } from './modules/integration/integration.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule,
    HttpModule.register({ timeout: 10000, maxRedirects: 5 }),
    TerminusModule,
    PrismaIntegrationModule,
    LoggerModule,
    RabbitMQModule.register(),
    MetricsModule,
    I18nModule,
    IntegrationModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: LanguageInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
  ],
})
export class AppModule {}
