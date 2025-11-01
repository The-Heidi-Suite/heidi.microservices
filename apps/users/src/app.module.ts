import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';
import { PrismaUsersModule } from '@heidi/prisma';
import { LoggerModule } from '@heidi/logger';
import { RabbitMQModule } from '@heidi/rabbitmq';
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
    MetricsModule,
    UsersModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TimeoutInterceptor },
  ],
})
export class AppModule {}
