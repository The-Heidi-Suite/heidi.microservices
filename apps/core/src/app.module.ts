import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@heidi/config';
import { PrismaCoreModule } from '@heidi/prisma';
import { LoggerModule } from '@heidi/logger';
import { RmqModule } from '@heidi/rabbitmq';
import { RedisModule } from '@heidi/redis';
import { MetricsModule, MetricsInterceptor } from '@heidi/metrics';
import {
  LoggingInterceptor,
  TransformInterceptor,
  SuccessMessageService,
} from '@heidi/interceptors';
import { I18nModule, LanguageInterceptor } from '@heidi/i18n';
import { TranslationModule } from '@heidi/translations';
import { TermsAcceptanceGuard } from '@heidi/rbac';
import { CoreModule } from './modules/core/core.module';
import { ListingsModule } from './modules/listings/listings.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { TilesModule } from './modules/tiles/tiles.module';
import { TagsModule } from './modules/tags/tags.module';
import { HealthController } from './health.controller';
import { JwtModule } from '@heidi/jwt';
import { RBACModule } from '@heidi/rbac';
import { ErrorHandlingModule } from '@heidi/errors';
import { StorageModule } from '@heidi/storage';
import { TenancyModule } from '@heidi/tenancy';

@Module({
  imports: [
    ConfigModule,
    PrismaCoreModule,
    LoggerModule,
    StorageModule,
    RmqModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: () => ({ serviceName: 'core' }),
    }),
    RedisModule,
    MetricsModule,
    I18nModule,
    TranslationModule,
    JwtModule.register(),
    RBACModule,
    ErrorHandlingModule,
    TenancyModule,
    CoreModule,
    ListingsModule,
    TagsModule,
    CategoriesModule,
    TilesModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: LanguageInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    SuccessMessageService,
    {
      provide: APP_GUARD,
      useClass: TermsAcceptanceGuard,
    },
  ],
})
export class AppModule {}
