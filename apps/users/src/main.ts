import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { LoggerService } from '@heidi/logger';
import { ConfigService } from '@heidi/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const logger = await app.resolve(LoggerService);
  logger.setContext('Users-Service');
  app.useLogger(logger);

  app.use(helmet());
  const configService = app.get(ConfigService);
  app.enableCors({ origin: configService.get<string>('corsOrigin', '*'), credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableShutdownHooks();

  // Swagger setup
  const swaggerConfig = configService.swaggerConfig;
  const swaggerTitle = `Users Service | ${swaggerConfig.title || 'HEIDI Microservices API'}`;

  const config = new DocumentBuilder()
    .setTitle(swaggerTitle)
    .setDescription(swaggerConfig.description || 'API documentation for HEIDI Users Service')
    .setVersion(swaggerConfig.version || '1.0')
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
    .addTag('users', 'User management endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = configService.get<number>('users.port', 3002);
  await app.listen(port);

  logger.log(`🚀 Users service is running on: http://localhost:${port}`);
  logger.log(`📊 Metrics available at: http://localhost:${port}/metrics`);
  logger.log(`💚 Health check at: http://localhost:${port}/healthz`);
  logger.log(`📚 Swagger docs available at: http://localhost:${port}/api`);
}

bootstrap();
