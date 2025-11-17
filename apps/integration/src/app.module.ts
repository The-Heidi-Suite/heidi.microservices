import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { HttpModule } from '@nestjs/axios';
import { TerminusModule } from '@nestjs/terminus';
import { ConfigModule, ConfigService } from '@heidi/config';
import { PrismaIntegrationModule } from '@heidi/prisma';
import { LoggerModule } from '@heidi/logger';
import { RmqModule } from '@heidi/rabbitmq';
import { JwtModule } from '@heidi/jwt';
import { MetricsModule, MetricsInterceptor } from '@heidi/metrics';
import {
  LoggingInterceptor,
  TimeoutInterceptor,
  TransformInterceptor,
  SuccessMessageService,
} from '@heidi/interceptors';
import { I18nModule, LanguageInterceptor } from '@heidi/i18n';
import { ErrorHandlingModule } from '@heidi/errors';
import { IntegrationModule } from './modules/integration/integration.module';
import { DestinationOneModule } from './modules/destination-one/destination-one.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule,
    HttpModule.register({ timeout: 10000, maxRedirects: 5 }),
    TerminusModule,
    PrismaIntegrationModule,
    LoggerModule,
    RmqModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: () => ({ serviceName: 'integration' }),
    }),
    JwtModule.register(),
    MetricsModule,
    I18nModule,
    ErrorHandlingModule,
    DestinationOneModule,
    IntegrationModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LanguageInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useFactory: (configService: ConfigService) => {
        const timeoutMs = configService.get<number>('requestTimeoutMs', 30000);
        return new TimeoutInterceptor(timeoutMs);
      },
      inject: [ConfigService],
    },
    SuccessMessageService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule {}
