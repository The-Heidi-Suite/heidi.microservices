import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@heidi/config';
import { PrismaModule } from '@heidi/prisma';
import { RedisModule } from '@heidi/redis';
import { HealthCheckService } from './health-check.service';

@Global()
@Module({
  imports: [ConfigModule, PrismaModule, RedisModule],
  providers: [HealthCheckService],
  exports: [HealthCheckService],
})
export class HealthModule {}
