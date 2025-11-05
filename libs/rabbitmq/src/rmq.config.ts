import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@heidi/config';
import {
  RABBITMQ_EXCHANGE,
  RABBITMQ_EXCHANGE_TYPE,
  getQueueName,
  getRoutingKeyPattern,
} from './rmq.constants';
import { RmqClientOptions } from './rmq.interfaces';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
  PREFETCH_COUNT: 10,
  HEARTBEAT_INTERVAL: 30,
  RECONNECT_TIME: 5,
  MESSAGE_TTL: 30000, // 30 seconds
} as const;

/**
 * Get RabbitMQ connection URL from ConfigService
 */
function getRabbitMQUrl(configService: ConfigService): string {
  const rabbitConfig = configService.rabbitmqConfig;
  return `amqp://${rabbitConfig.user}:${rabbitConfig.password}@${rabbitConfig.host}:${rabbitConfig.port}${rabbitConfig.vhost}`;
}

/**
 * Get RabbitMQ client options for outgoing messages (producer)
 * This creates a ClientProxy that publishes to the exchange
 *
 * @param configService - Configuration service
 * @param serviceName - Optional service name for identification
 * @returns ClientProxy configuration options
 */
export function getRmqClientOptions(
  configService: ConfigService,
  _serviceName?: string,
): RmqClientOptions {
  const url = getRabbitMQUrl(configService);

  return {
    urls: [url],
    exchange: RABBITMQ_EXCHANGE,
    exchangeType: RABBITMQ_EXCHANGE_TYPE,
    socketOptions: {
      heartbeatIntervalInSeconds: DEFAULT_CONFIG.HEARTBEAT_INTERVAL,
      reconnectTimeInSeconds: DEFAULT_CONFIG.RECONNECT_TIME,
    },
  };
}

/**
 * Get RabbitMQ consumer options for incoming messages
 * Creates a service-specific queue bound to the exchange with DLX support
 *
 * @param configService - Configuration service
 * @param serviceName - Name of the service (e.g., 'users', 'core', 'auth')
 * @param options - Optional configuration overrides
 * @returns MicroserviceOptions for app.connectMicroservice
 */
export function getRmqConsumerOptions(
  configService: ConfigService,
  serviceName: string,
  options?: {
    prefetchCount?: number;
    messageTtl?: number;
    durable?: boolean;
  },
): MicroserviceOptions {
  const url = getRabbitMQUrl(configService);
  const queueName = getQueueName(serviceName);
  const routingKey = getRoutingKeyPattern(serviceName);
  const prefetchCount = options?.prefetchCount ?? DEFAULT_CONFIG.PREFETCH_COUNT;
  const messageTtl = options?.messageTtl ?? DEFAULT_CONFIG.MESSAGE_TTL;
  const durable = options?.durable ?? true;

  // DLX configuration: messages that fail or timeout will go to DLX queue
  // After TTL expires, they'll be republished to the original queue for retry
  const queueOptions: any = {
    durable,
    noAck: false, // Manual acknowledgment - allows NACK for unmatched messages
    prefetchCount,
    // Dead Letter Exchange configuration
    deadLetterExchange: RABBITMQ_EXCHANGE,
    deadLetterRoutingKey: routingKey,
    // Message TTL for automatic retry
    messageTtl,
    // Additional arguments for DLX queue binding
    arguments: {
      'x-dead-letter-exchange': RABBITMQ_EXCHANGE,
      'x-dead-letter-routing-key': routingKey,
      'x-message-ttl': messageTtl,
    },
  };

  return {
    transport: Transport.RMQ,
    options: {
      urls: [url],
      queue: queueName,
      exchange: RABBITMQ_EXCHANGE,
      exchangeType: RABBITMQ_EXCHANGE_TYPE,
      routingKey,
      queueOptions,
      socketOptions: {
        heartbeatIntervalInSeconds: DEFAULT_CONFIG.HEARTBEAT_INTERVAL,
        reconnectTimeInSeconds: DEFAULT_CONFIG.RECONNECT_TIME,
      },
    },
  };
}
