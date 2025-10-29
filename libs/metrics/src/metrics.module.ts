import { Global, Module } from '@nestjs/common';
import { LoggerModule } from '@heidi/logger';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { MetricsInterceptor } from './metrics.interceptor';

@Global()
@Module({
  imports: [LoggerModule],
  controllers: [MetricsController],
  providers: [MetricsService, MetricsInterceptor],
  exports: [MetricsService, MetricsInterceptor],
})
export class MetricsModule {}
