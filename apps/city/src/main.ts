import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { LoggerService } from '@heidi/logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const logger = app.get(LoggerService);
  logger.setContext('City-Service');
  app.useLogger(logger);

  app.use(helmet());
  app.enableCors({ origin: process.env.CORS_ORIGIN || '*', credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableShutdownHooks();

  const port = process.env.CITY_SERVICE_PORT || 3003;
  await app.listen(port);

  logger.log(`🚀 City service is running on: http://localhost:${port}`);
}

bootstrap();
