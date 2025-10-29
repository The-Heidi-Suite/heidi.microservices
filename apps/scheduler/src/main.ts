import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { LoggerService } from '@heidi/logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const logger = app.get(LoggerService);
  logger.setContext('Scheduler-Service');
  app.useLogger(logger);

  app.use(helmet());
  app.enableCors({ origin: process.env.CORS_ORIGIN || '*', credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableShutdownHooks();

  const port = process.env.SCHEDULER_SERVICE_PORT || 3006;
  await app.listen(port);

  logger.log(`🚀 Scheduler service is running on: http://localhost:${port}`);
}

bootstrap();
