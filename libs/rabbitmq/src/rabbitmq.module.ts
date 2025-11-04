import { DynamicModule, Global, Module } from '@nestjs/common';
import { LoggerModule } from '@heidi/logger';
import { ConfigModule } from '@heidi/config';
import { RabbitMQService } from './rabbitmq.service';

export interface RabbitMQModuleOptions {
  // Options kept for future extensibility, currently RabbitMQService uses ConfigService directly
}

@Global()
@Module({})
export class RabbitMQModule {
  static register(_options?: RabbitMQModuleOptions): DynamicModule {
    // RabbitMQService creates its own client using ConfigService, so we don't need ClientsModule
    return {
      module: RabbitMQModule,
      imports: [ConfigModule, LoggerModule],
      providers: [RabbitMQService],
      exports: [RabbitMQService],
    };
  }
}
