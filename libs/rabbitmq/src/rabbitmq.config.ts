import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@heidi/config';

/**
 * Get standardized RabbitMQ microservice options for connectMicroservice
 * This ensures consistent configuration across all microservices
 */
export function getRabbitMQMicroserviceOptions(
  configService: ConfigService,
): MicroserviceOptions {
  const rabbitConfig = configService.rabbitmqConfig;
  const rabbitmqUrl = `amqp://${rabbitConfig.user}:${rabbitConfig.password}@${rabbitConfig.host}:${rabbitConfig.port}${rabbitConfig.vhost}`;

  return {
    transport: Transport.RMQ,
    options: {
      urls: [rabbitmqUrl],
      queue: 'heidi_queue',
      queueOptions: {
        durable: true,
        noAck: false, // Manual acknowledgment - allows NACK for unmatched messages
        prefetchCount: 10,
      },
      socketOptions: {
        heartbeatIntervalInSeconds: 30,
        reconnectTimeInSeconds: 5,
      },
    },
  };
}
