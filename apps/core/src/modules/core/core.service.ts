import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RabbitMQService, RabbitMQPatterns } from '@heidi/rabbitmq';
import { RedisService } from '@heidi/redis';

@Injectable()
export class CoreService implements OnModuleInit {
  private readonly logger = new Logger(CoreService.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly redis: RedisService,
  ) {}

  async onModuleInit() {
    // Listen to events from other services
    this.logger.log('Core service initialized - listening to events');
  }

  async getStatus() {
    const cachedStatus = await this.redis.get('core:status');
    if (cachedStatus) {
      return cachedStatus;
    }

    const status = {
      service: 'core',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      memory: process.memoryUsage(),
    };

    await this.redis.set('core:status', status, 30);
    return status;
  }

  async executeOperation(payload: any) {
    this.logger.log(`Executing operation: ${JSON.stringify(payload)}`);

    // Example: Orchestrate operations across services
    await this.rabbitmq.emit(RabbitMQPatterns.CORE_OPERATION, {
      ...payload,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      message: 'Operation queued for execution',
      operationId: Date.now().toString(),
    };
  }
}
