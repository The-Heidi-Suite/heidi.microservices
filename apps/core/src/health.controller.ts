import { Controller, Get } from '@nestjs/common';
import { RedisService } from '@heidi/redis';
import { RabbitMQService } from '@heidi/rabbitmq';

@Controller('healthz')
export class HealthController {
  constructor(
    private redis: RedisService,
    private rabbitmq: RabbitMQService,
  ) {}

  @Get()
  async check() {
    return {
      status: 'ok',
      redis: (await this.redis.healthCheck()) ? 'up' : 'down',
      rabbitmq: (await this.rabbitmq.healthCheck()) ? 'up' : 'down',
      timestamp: new Date().toISOString(),
    };
  }
}
