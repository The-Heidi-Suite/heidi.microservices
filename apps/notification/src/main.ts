import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions } from '@nestjs/microservices';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { LoggerService } from '@heidi/logger';
import { ConfigService } from '@heidi/config';
import { getRabbitMQMicroserviceOptions } from '@heidi/rabbitmq';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const logger = await app.resolve(LoggerService);
  logger.setContext('Notification-Service');
  app.useLogger(logger);

  app.use(helmet());
  const configService = app.get(ConfigService);
  app.enableCors({ origin: configService.get<string>('corsOrigin', '*'), credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableShutdownHooks();

  // Connect RabbitMQ microservice (for request-response patterns)
  app.connectMicroservice<MicroserviceOptions>(
    getRabbitMQMicroserviceOptions(configService),
  );

  await app.startAllMicroservices();
  logger.log('RabbitMQ microservice connected');

  const port = configService.get<number>('notification.port', 3005);
  await app.listen(port);

  logger.log(`🚀 Notification service is running on: http://localhost:${port}`);
}

bootstrap();
