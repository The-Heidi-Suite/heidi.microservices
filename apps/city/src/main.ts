import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { LoggerService } from '@heidi/logger';
import { ConfigService } from '@heidi/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const logger = await app.resolve(LoggerService);
  logger.setContext('City-Service');
  app.useLogger(logger);

  app.use(helmet());
  const configService = app.get(ConfigService);
  app.enableCors({ origin: configService.get<string>('corsOrigin', '*'), credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableShutdownHooks();

  // Connect RabbitMQ microservice (for request-response patterns)
  const rabbitConfig = configService.rabbitmqConfig;
  const rabbitmqUrl = `amqp://${rabbitConfig.user}:${rabbitConfig.password}@${rabbitConfig.host}:${rabbitConfig.port}${rabbitConfig.vhost}`;

  app.connectMicroservice<MicroserviceOptions>({
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
  });

  await app.startAllMicroservices();
  logger.log('RabbitMQ microservice connected');

  const port = configService.get<number>('city.port', 3003);
  await app.listen(port);

  logger.log(`🚀 City service is running on: http://localhost:${port}`);
}

bootstrap();
