import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';
import { PrismaCityModule } from '@heidi/prisma';
import { LoggerModule } from '@heidi/logger';
import { MetricsModule, MetricsInterceptor } from '@heidi/metrics';
import { LoggingInterceptor } from '@heidi/interceptors';
import { I18nModule, LanguageInterceptor } from '@heidi/i18n';
import { CityModule } from './modules/city/city.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TerminusModule,
    PrismaCityModule,
    LoggerModule,
    MetricsModule,
    I18nModule,
    CityModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: LanguageInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
  ],
})
export class AppModule {}
