import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@heidi/config';
import { PrismaCoreModule } from '@heidi/prisma';
import { LoggerModule } from '@heidi/logger';
import { RmqModule } from '@heidi/rabbitmq';
import { RedisModule } from '@heidi/redis';
import { MetricsModule, MetricsInterceptor } from '@heidi/metrics';
import { LoggingInterceptor } from '@heidi/interceptors';
import { I18nModule, LanguageInterceptor } from '@heidi/i18n';
import { TermsAcceptanceGuard } from '@heidi/rbac';
import { CoreModule } from './modules/core/core.module';
import { ListingsModule } from './modules/listings/listings.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule,
    PrismaCoreModule,
    LoggerModule,
    RmqModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: () => ({ serviceName: 'core' }),
    }),
    RedisModule,
    MetricsModule,
    I18nModule,
    CoreModule,
    ListingsModule,
    CategoriesModule,
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
