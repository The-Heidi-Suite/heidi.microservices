import { Global, Module } from '@nestjs/common';
import { LoggerModule } from '@heidi/logger';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [LoggerModule],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
