import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { LoggerService } from '@heidi/logger';
import { ConfigService } from '@heidi/config';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';

export interface RabbitMQConfig {
  url: string;
  queue?: string;
  queueOptions?: {
    durable?: boolean;
    noAck?: boolean;
    prefetchCount?: number;
  };
}

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private client: ClientProxy;
  private config: RabbitMQConfig;

  constructor(
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
  ) {
    this.logger.setContext(RabbitMQService.name);
    const rabbitConfig = this.configService.rabbitmqConfig;
    const url = `amqp://${rabbitConfig.user}:${rabbitConfig.password}@${rabbitConfig.host}:${rabbitConfig.port}${rabbitConfig.vhost}`;

    this.config = {
      url,
      queue: 'heidi_queue',
      queueOptions: {
        durable: true,
        noAck: false,
        prefetchCount: 10,
      },
    };

    this.client = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [this.config.url],
        queue: this.config.queue,
        queueOptions: this.config.queueOptions,
        socketOptions: {
          heartbeatIntervalInSeconds: 30,
          reconnectTimeInSeconds: 5,
        },
      },
    });
  }

  async onModuleInit() {
    try {
      await this.client.connect();
      this.logger.log('Successfully connected to RabbitMQ');
    } catch (error) {
      this.logger.error('Failed to connect to RabbitMQ', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.client.close();
      this.logger.log('Disconnected from RabbitMQ');
    } catch (error) {
      this.logger.error('Error disconnecting from RabbitMQ', error);
    }
  }

  /**
   * Emit an event (fire and forget)
   */
  async emit<T = any>(pattern: string, data: T): Promise<void> {
    try {
      this.client.emit(pattern, data);
      this.logger.debug(`Emitted event: ${pattern}`);
    } catch (error) {
      this.logger.error(`Failed to emit event: ${pattern}`, error);
      throw error;
    }
  }

  /**
   * Send a message and wait for response (request-response)
   */
  async send<TResult = any, TInput = any>(
    pattern: string,
    data: TInput,
    timeoutMs: number = 5000,
  ): Promise<TResult> {
    try {
      const response = await firstValueFrom(
        this.client.send<TResult>(pattern, data).pipe(timeout(timeoutMs)),
      );
      this.logger.debug(`Sent message: ${pattern}`);
      return response;
    } catch (error) {
      this.logger.error(`Failed to send message: ${pattern}`, error);
      throw error;
    }
  }

  /**
   * Publish to a specific exchange
   */
  async publish<T = any>(exchange: string, routingKey: string, data: T): Promise<void> {
    try {
      await this.emit(`${exchange}.${routingKey}`, data);
      this.logger.debug(`Published to exchange: ${exchange}, routing key: ${routingKey}`);
    } catch (error) {
      this.logger.error(`Failed to publish to exchange: ${exchange}`, error);
      throw error;
    }
  }

  /**
   * Get the underlying client proxy
   */
  getClient(): ClientProxy {
    return this.client;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Simple check - if we can emit without error, connection is healthy
      await this.emit('health.check', { timestamp: Date.now() });
      return true;
    } catch (error) {
      this.logger.error('RabbitMQ health check failed', error);
      return false;
    }
  }
}

/**
 * Event patterns for the microservices
 */
export const RabbitMQPatterns = {
  // User events (fire and forget)
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',

  // User request-response patterns
  USER_FIND_BY_EMAIL: 'user.findByEmail',
  USER_FIND_BY_ID: 'user.findById',
  USER_GET_PROFILE: 'user.getProfile',

  // Core request-response patterns
  CORE_GET_USER_CITIES: 'core.getUserCities',
  CORE_GET_USER_ASSIGNMENTS: 'core.getUserAssignments',
  CORE_ASSIGN_CITY_ADMIN: 'core.assignCityAdmin',

  // Notification events
  NOTIFICATION_SEND: 'notification.send',
  NOTIFICATION_SENT: 'notification.sent',
  NOTIFICATION_FAILED: 'notification.failed',

  // City events
  CITY_CREATED: 'city.created',
  CITY_UPDATED: 'city.updated',
  CITY_DELETED: 'city.deleted',

  // Integration events
  INTEGRATION_WEBHOOK: 'integration.webhook',
  INTEGRATION_SYNC: 'integration.sync',

  // Scheduler events
  SCHEDULE_EXECUTE: 'schedule.execute',
  SCHEDULE_COMPLETED: 'schedule.completed',

  // Core events (fire and forget)
  CORE_OPERATION: 'core.operation',
};
