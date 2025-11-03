import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { LoggerService } from '@heidi/logger';
import { ConfigService } from '@heidi/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Use custom logger
  const logger = await app.resolve(LoggerService);
  logger.setContext('Admin-Service');
  app.useLogger(logger);

  // Security
  app.use(helmet());
  const configService = app.get(ConfigService);
  app.enableCors({
    origin: configService.get<string>('corsOrigin', '*'),
    credentials: true,
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Graceful shutdown
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

  const port = configService.get<number>('admin.port', 3008);
  await app.listen(port);

  logger.log(`🚀 Admin service is running on: http://localhost:${port}`);
  logger.log(`📊 Metrics available at: http://localhost:${port}/metrics`);
  logger.log(`💚 Health check at: http://localhost:${port}/healthz`);
}

bootstrap();
