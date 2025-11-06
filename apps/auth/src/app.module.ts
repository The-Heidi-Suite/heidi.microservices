import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';
import { ThrottlerModule } from '@nestjs/throttler';

// Shared libraries
import { ConfigModule, ConfigService } from '@heidi/config';
import { PrismaAuthModule } from '@heidi/prisma';
import { LoggerModule } from '@heidi/logger';
import { RmqModule } from '@heidi/rabbitmq';
import { RedisModule } from '@heidi/redis';
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
import { TermsAcceptanceGuard } from '@heidi/rbac';

// Local modules
import { AuthModule } from './modules/auth/auth.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    // Configuration
    ConfigModule,

    // Rate limiting
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('throttle.ttl', 60) * 1000,
          limit: configService.get<number>('throttle.limit', 100),
        },
      ],
    }),

    // Health checks
    TerminusModule,

    // Shared libraries
    PrismaAuthModule,
    LoggerModule,
    RmqModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: () => ({ serviceName: 'auth' }),
    }),
    RedisModule,
    JwtModule.register(),
    MetricsModule,
    I18nModule,
    ErrorHandlingModule,

    // Feature modules
    AuthModule,
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
    {
      provide: APP_GUARD,
      useClass: TermsAcceptanceGuard,
    },
  ],
})
export class AppModule {}
