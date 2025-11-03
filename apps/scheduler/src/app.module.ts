import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { TerminusModule } from '@nestjs/terminus';
import { PrismaSchedulerModule } from '@heidi/prisma';
import { LoggerModule } from '@heidi/logger';
import { RabbitMQModule } from '@heidi/rabbitmq';
import { RedisModule } from '@heidi/redis';
import { MetricsModule, MetricsInterceptor } from '@heidi/metrics';
import { LoggingInterceptor } from '@heidi/interceptors';
import { I18nModule, LanguageInterceptor } from '@heidi/i18n';
import { TasksModule } from './modules/tasks/tasks.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TerminusModule,
    PrismaSchedulerModule,
    LoggerModule,
    RabbitMQModule.register(),
    RedisModule,
    MetricsModule,
    I18nModule,
    TasksModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: LanguageInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
  ],
})
export class AppModule {}
