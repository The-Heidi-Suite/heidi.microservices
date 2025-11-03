import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { LoggerService } from '@heidi/logger';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Use custom logger
  const logger = await app.resolve(LoggerService);
  logger.setContext('Auth-Service');
  app.useLogger(logger);

  // Security
  app.use(helmet());
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
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

  // Swagger setup
  const configService = app.get(ConfigService);
  const swaggerConfig = {
    title: configService.get<string>('SWAGGER_TITLE') || 'HEIDI Auth Service API',
    description:
      configService.get<string>('SWAGGER_DESCRIPTION') ||
      'API documentation for HEIDI Authentication Service',
    version: configService.get<string>('SWAGGER_VERSION') || '1.0',
  };

  const config = new DocumentBuilder()
    .setTitle(swaggerConfig.title)
    .setDescription(swaggerConfig.description)
    .setVersion(swaggerConfig.version)
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('auth', 'Authentication endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.AUTH_SERVICE_PORT || 3001;
  await app.listen(port);

  logger.log(`🚀 Auth service is running on: http://localhost:${port}`);
  logger.log(`📊 Metrics available at: http://localhost:${port}/metrics`);
  logger.log(`💚 Health check at: http://localhost:${port}/healthz`);
  logger.log(`📚 Swagger docs available at: http://localhost:${port}/api`);
}

bootstrap();
