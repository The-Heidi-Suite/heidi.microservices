import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';
import { PrismaUsersModule } from '@heidi/prisma';
import { LoggerModule } from '@heidi/logger';
import { RabbitMQModule } from '@heidi/rabbitmq';
import { JwtModule } from '@heidi/jwt';
import { MetricsModule, MetricsInterceptor } from '@heidi/metrics';
import { LoggingInterceptor, TimeoutInterceptor } from '@heidi/interceptors';
import { UsersModule } from './modules/users/users.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TerminusModule,
    PrismaUsersModule,
    LoggerModule,
    RabbitMQModule.register(),
    JwtModule.register(),
    MetricsModule,
    UsersModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
    {
      provide: APP_INTERCEPTOR,
      useFactory: () => {
        const timeoutMs = parseInt(process.env.REQUEST_TIMEOUT_MS || '30000', 10);
        return new TimeoutInterceptor(timeoutMs);
      },
    },
  ],
})
export class AppModule {}
