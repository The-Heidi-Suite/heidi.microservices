import { DynamicModule, Global, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RabbitMQService } from './rabbitmq.service';

export interface RabbitMQModuleOptions {
  name?: string;
  url?: string;
  queue?: string;
}

@Global()
@Module({})
export class RabbitMQModule {
  static register(options?: RabbitMQModuleOptions): DynamicModule {
    const url = options?.url || process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    const queue = options?.queue || process.env.RABBITMQ_QUEUE || 'heidi_queue';
    const name = options?.name || 'RABBITMQ_CLIENT';

    return {
      module: RabbitMQModule,
      imports: [
        ClientsModule.register([
          {
            name,
            transport: Transport.RMQ,
            options: {
              urls: [url],
              queue,
              queueOptions: {
                durable: true,
              },
            },
          },
        ]),
      ],
      providers: [RabbitMQService],
      exports: [RabbitMQService, ClientsModule],
    };
  }
}
