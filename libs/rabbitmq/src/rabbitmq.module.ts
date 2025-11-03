import { DynamicModule, Global, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { LoggerModule } from '@heidi/logger';
import { ConfigModule } from '@heidi/config';
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
    // Note: ConfigService cannot be injected in static method, so we use options or env directly
    // For dynamic configuration, prefer passing options explicitly
    const url = options?.url || process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    const queue = options?.queue || process.env.RABBITMQ_QUEUE || 'heidi_queue';
    const name = options?.name || 'RABBITMQ_CLIENT';

    return {
      module: RabbitMQModule,
      imports: [
        ConfigModule,
        LoggerModule,
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
