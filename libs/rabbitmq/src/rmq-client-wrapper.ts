import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { ConfigService } from '@heidi/config';
import { getQueueName, RABBITMQ_CLIENT } from './rmq.constants';
import { getRmqClientOptions } from './rmq.config';

/**
 * Extract service name from pattern (e.g., 'user.findByEmail' -> 'users')
 */
function getServiceNameFromPattern(pattern: string): string {
  // Pattern format: {service}.{action} (e.g., 'user.findByEmail', 'core.getUserCities')
  const parts = pattern.split('.');
  if (parts.length === 0) {
    throw new Error(`Invalid pattern format: ${pattern}. Expected format: 'service.action'`);
  }

  const servicePrefix = parts[0];
  // Map pattern prefixes to service names
  const serviceMap: Record<string, string> = {
    user: 'users',
    core: 'core',
    notification: 'notification',
    city: 'city',
    integration: 'integration',
    schedule: 'scheduler',
    terminal: 'terminal',
    admin: 'admin',
  };

  const serviceName = serviceMap[servicePrefix] || servicePrefix;
  return serviceName;
}

/**
 * RabbitMQ Client Wrapper
 * Provides a clean interface for sending messages with debug logging
 * Routes messages to service-specific queues based on pattern prefix
 * Creates ClientProxy instances dynamically per service queue
 */
@Injectable()
export class RmqClientWrapper {
  private clientCache: Map<string, ClientProxy> = new Map();
  private readonly baseClient: ClientProxy;
  private readonly configService: ConfigService;

  constructor(@Inject(RABBITMQ_CLIENT) baseClient: ClientProxy, configService: ConfigService) {
    this.baseClient = baseClient;
    this.configService = configService;
  }

  /**
   * Get or create a ClientProxy for a specific service queue
   */
  private getClientForQueue(queueName: string): ClientProxy {
    if (this.clientCache.has(queueName)) {
      return this.clientCache.get(queueName)!;
    }

    const clientOptions = getRmqClientOptions(this.configService);
    const client = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: clientOptions.urls,
        queue: queueName, // Send to service-specific queue
        queueOptions: {
          durable: true, // Match consumer queue durability
          exclusive: false,
          autoDelete: false,
        },
        socketOptions: clientOptions.socketOptions,
      },
    });

    this.clientCache.set(queueName, client);
    return client;
  }

  /**
   * Send a message and wait for response (request-response)
   * Routes to service-specific queue based on pattern (e.g., 'user.*' -> 'heidi_users_queue')
   */
  send<TResult = any, TInput = any>(pattern: string, data: TInput): Observable<TResult> {
    const serviceName = getServiceNameFromPattern(pattern);
    const targetQueue = getQueueName(serviceName);

    // Get client for this service's queue
    const client = this.getClientForQueue(targetQueue);

    // Send with original pattern - NestJS will include pattern in message metadata
    // Consumer's @MessagePattern will match based on pattern, not queue name
    const result$ = client.send<TResult, TInput>(pattern, data);
    return result$;
  }

  /**
   * Emit an event (fire and forget)
   * Routes to service-specific queue based on pattern
   */
  emit<T = any>(pattern: string, data: T): void {
    const serviceName = getServiceNameFromPattern(pattern);
    const targetQueue = getQueueName(serviceName);

    // Get client for this service's queue
    const client = this.getClientForQueue(targetQueue);
    client.emit<T>(pattern, data);
  }

  /**
   * Get the underlying client proxy
   */
  getClient(): ClientProxy {
    return this.baseClient;
  }
}
