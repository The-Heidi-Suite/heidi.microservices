import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HealthCheckResult } from '@nestjs/terminus';
import { PrismaService } from '@heidi/prisma';
import { RedisService } from '@heidi/redis';
import { RabbitMQService } from '@heidi/rabbitmq';
import { Public } from '@heidi/jwt';

@Controller('healthz')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prisma: PrismaService,
    private redis: RedisService,
    private rabbitmq: RabbitMQService,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  async check(): Promise<HealthCheckResult> {
    return this.health.check([
      async () => ({
        database: {
          status: (await this.prisma.healthCheck()) ? 'up' : 'down',
        },
      }),
      async () => ({
        redis: {
          status: (await this.redis.healthCheck()) ? 'up' : 'down',
        },
      }),
      async () => ({
        rabbitmq: {
          status: (await this.rabbitmq.healthCheck()) ? 'up' : 'down',
        },
      }),
    ]);
  }
}
