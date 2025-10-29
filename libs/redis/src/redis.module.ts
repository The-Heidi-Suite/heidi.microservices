import { Global, Module } from '@nestjs/common';
import { LoggerModule } from '@heidi/logger';
import { ConfigModule } from '@heidi/config';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [ConfigModule, LoggerModule],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
