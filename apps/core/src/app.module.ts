import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaCoreModule } from '@heidi/prisma';
import { LoggerModule } from '@heidi/logger';
import { RabbitMQModule } from '@heidi/rabbitmq';
import { RedisModule } from '@heidi/redis';
import { MetricsModule, MetricsInterceptor } from '@heidi/metrics';
import { LoggingInterceptor } from '@heidi/interceptors';
import { CoreModule } from './modules/core/core.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaCoreModule,
    LoggerModule,
    RabbitMQModule.register(),
    RedisModule,
    MetricsModule,
    CoreModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
  ],
})
export class AppModule {}
