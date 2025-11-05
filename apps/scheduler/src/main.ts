import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions } from '@nestjs/microservices';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { LoggerService } from '@heidi/logger';
import { ConfigService } from '@heidi/config';
import { getRmqConsumerOptions } from '@heidi/rabbitmq';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const logger = await app.resolve(LoggerService);
  logger.setContext('Scheduler-Service');
  app.useLogger(logger);

  app.use(helmet());
  const configService = app.get(ConfigService);
  app.enableCors({ origin: configService.get<string>('corsOrigin', '*'), credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableShutdownHooks();

  // Connect RabbitMQ microservice (for request-response patterns)
  // Uses service-specific queue with topic exchange routing
  app.connectMicroservice<MicroserviceOptions>(getRmqConsumerOptions(configService, 'scheduler'));

  await app.startAllMicroservices();
  logger.log('RabbitMQ microservice connected');

  const port = configService.get<number>('scheduler.port', 3006);
  await app.listen(port);

  logger.log(`🚀 Scheduler service is running on: http://localhost:${port}`);
}

bootstrap();
