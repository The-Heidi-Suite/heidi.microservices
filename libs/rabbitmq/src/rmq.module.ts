import { DynamicModule, Global, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule } from '@heidi/config';
import { LoggerModule } from '@heidi/logger';
import { RmqModuleAsyncOptions, RmqModuleOptions } from './rmq.interfaces';
import { getRmqClientOptions } from './rmq.config';
import { RABBITMQ_CLIENT } from './rmq.constants';

/**
 * RabbitMQ Client Injection Token
 * Use with @Inject(RABBITMQ_CLIENT) to inject the ClientProxy
 */
export { RABBITMQ_CLIENT } from './rmq.constants';

/**
 * RabbitMQ Module
 * Provides ClientProxy for outgoing messages and configuration helpers
 */
@Global()
@Module({})
export class RmqModule {
  /**
   * Configure RabbitMQ module for outgoing messages (producer/client)
   * Sets up a ClientProxy that can be injected via @Inject(RABBITMQ_CLIENT)
   *
   * @param options - Configuration options
   * @returns DynamicModule
   *
   * @example
   * ```typescript
   * RmqModule.forRootAsync({
   *   imports: [ConfigModule],
   *   inject: [ConfigService],
   *   useFactory: (config: ConfigService) => ({
   *     serviceName: 'auth',
   *   }),
   * })
   * ```
   */
  static forRootAsync(options: RmqModuleAsyncOptions): DynamicModule {
    return {
      module: RmqModule,
      imports: [
        ConfigModule,
        LoggerModule,
        ClientsModule.registerAsync([
          {
            name: RABBITMQ_CLIENT,
            imports: options.imports || [ConfigModule],
            inject: options.inject || [],
            useFactory: async (...args: any[]) => {
              // Find ConfigService in injected dependencies
              const configService = args.find(
                (arg) =>
                  arg && typeof arg.get === 'function' && typeof arg.rabbitmqConfig !== 'undefined',
              );
              if (!configService) {
                throw new Error(
                  'ConfigService not found in inject array. Make sure ConfigService is included in inject.',
                );
              }

              // Get module options
              const moduleOptions: RmqModuleOptions = options.useFactory
                ? await options.useFactory(...args)
                : {};

              // Get client options
              const clientOptions = getRmqClientOptions(configService, moduleOptions.serviceName);

              // Return ClientProxy configuration
              return {
                transport: Transport.RMQ,
                options: {
                  urls: clientOptions.urls,
                  exchange: clientOptions.exchange,
                  exchangeType: clientOptions.exchangeType,
                  socketOptions: clientOptions.socketOptions,
                },
              };
            },
          },
        ]),
      ],
      exports: [ClientsModule],
    };
  }

  /**
   * Configure RabbitMQ module for consuming messages
   * This is mainly for documentation - actual connection is done in main.ts
   * using getRmqConsumerOptions()
   *
   * @param options - Configuration options (currently unused, kept for future extensibility)
   * @returns DynamicModule
   *
   * @example
   * ```typescript
   * // In main.ts:
   * app.connectMicroservice(
   *   getRmqConsumerOptions(configService, 'users')
   * );
   * ```
   */
  static forConsumer(_options?: RmqModuleOptions): DynamicModule {
    return {
      module: RmqModule,
      imports: [ConfigModule, LoggerModule],
      providers: [],
      exports: [],
    };
  }
}
