import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions } from '@nestjs/microservices';
import helmet from 'helmet';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { LoggerService } from '@heidi/logger';
import { ConfigService, getSwaggerServerUrl, getSwaggerI18nOptions } from '@heidi/config';
import { getRmqConsumerOptions } from '@heidi/rabbitmq';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Use custom logger
  const logger = await app.resolve(LoggerService);
  logger.setContext('Auth-Service');
  app.useLogger(logger);

  // Security
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Allow inline scripts for Swagger UI
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'], // Allow inline styles and Google Fonts
          fontSrc: ["'self'", 'https://fonts.gstatic.com'], // Allow Google Fonts font files
        },
      },
    }),
  );
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
  // Auth service primarily sends messages, but may receive some patterns
  app.connectMicroservice<MicroserviceOptions>(getRmqConsumerOptions(configService, 'auth'));

  await app.startAllMicroservices();
  logger.log('RabbitMQ microservice connected');

  // Swagger setup
  const swaggerConfig = configService.swaggerConfig;
  const swaggerTitle = `Auth Service | ${swaggerConfig.title || 'HEIDI Microservices API'}`;
  const serverUrl = getSwaggerServerUrl(configService, 'auth');

  const documentBuilder = new DocumentBuilder()
    .setTitle(swaggerTitle)
    .setDescription(
      swaggerConfig.description || 'API documentation for HEIDI Authentication Service',
    )
    .setVersion(swaggerConfig.version || '1.0');

  // Only add server URL if API gateway prefix is enabled (for production/server)
  if (serverUrl) {
    documentBuilder.addServer(serverUrl, 'API Gateway Path');
  }

  const config = documentBuilder
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

  // Use i18n-enabled Swagger options
  const swaggerI18nOptions = getSwaggerI18nOptions(configService);

  SwaggerModule.setup('docs', app, document, {
    ...swaggerI18nOptions,
    swaggerOptions: {
      ...swaggerI18nOptions.swaggerOptions,
      persistAuthorization: true,
    },
  });

  const port = configService.get<number>('auth.port', 3001);
  await app.listen(port);

  logger.log(`🚀 Auth service is running on: http://localhost:${port}`);
  logger.log(`📊 Metrics available at: http://localhost:${port}/metrics`);
  logger.log(`💚 Health check at: http://localhost:${port}/healthz`);
  logger.log(`📚 Swagger docs available at: http://localhost:${port}/docs`);
}

bootstrap();
