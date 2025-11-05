import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { ConfigModule } from '@heidi/config';
import { LoggerModule } from '@heidi/logger';
import { RmqModuleAsyncOptions, RmqModuleOptions } from './rmq.interfaces';
import { getRmqClientOptions } from './rmq.config';
import { RABBITMQ_CLIENT } from './rmq.constants';
import { RmqClientWrapper } from './rmq-client-wrapper';

/**
 * RabbitMQ Client Injection Token
 * Use with @Inject(RABBITMQ_CLIENT) to inject the ClientProxy
 */
export { RABBITMQ_CLIENT } from './rmq.constants';
export { RmqClientWrapper } from './rmq-client-wrapper';

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
    // Create wrapper provider - RABBITMQ_CLIENT now provides RmqClientWrapper
    // Services inject RABBITMQ_CLIENT and get the wrapper with dynamic queue routing
    const wrapperProvider: Provider = {
      provide: RABBITMQ_CLIENT,
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

        // Create base client for wrapper
        const baseClient = ClientProxyFactory.create({
          transport: Transport.RMQ,
          options: {
            urls: clientOptions.urls,
            // No queue specified - RmqClientWrapper handles routing dynamically
            socketOptions: clientOptions.socketOptions,
          },
        });

        // Create and return wrapper - this is what services will inject
        const wrapper = new RmqClientWrapper(baseClient, configService);
        return wrapper;
      },
      inject: options.inject || [],
    };

    return {
      module: RmqModule,
      imports: [ConfigModule, LoggerModule],
      providers: [wrapperProvider],
      exports: [RABBITMQ_CLIENT],
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
