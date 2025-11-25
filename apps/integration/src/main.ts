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
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const logger = await app.resolve(LoggerService);
  logger.setContext('Integration-Service');
  app.useLogger(logger);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        },
      },
    }),
  );
  const configService = app.get(ConfigService);
  app.enableCors({ origin: configService.get<string>('corsOrigin', '*'), credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableShutdownHooks();

  // Connect RabbitMQ microservice (for request-response patterns)
  // Uses service-specific queue with topic exchange routing
  app.connectMicroservice<MicroserviceOptions>(getRmqConsumerOptions(configService, 'integration'));

  await app.startAllMicroservices();
  logger.log('RabbitMQ microservice connected');

  // Swagger setup
  const swaggerConfig = configService.swaggerConfig;
  const swaggerTitle = `Integration Service | ${swaggerConfig.title || 'HEIDI Microservices API'}`;
  const serverUrl = getSwaggerServerUrl(configService, 'integration');

  const documentBuilder = new DocumentBuilder()
    .setTitle(swaggerTitle)
    .setDescription(swaggerConfig.description || 'API documentation for HEIDI Integration Service')
    .setVersion(swaggerConfig.version || '1.0');

  if (serverUrl) {
    documentBuilder.addServer(serverUrl, 'API Gateway Path');
  }

  const swaggerDocConfig = documentBuilder
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
    .addTag('integration', 'Integration endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerDocConfig);

  // Use i18n-enabled Swagger options (language selector + Accept-Language header)
  const swaggerI18nOptions = getSwaggerI18nOptions(configService);

  SwaggerModule.setup('docs', app, document, {
    ...swaggerI18nOptions,
    swaggerOptions: {
      ...swaggerI18nOptions.swaggerOptions,
    },
  });

  const port = configService.get<number>('integration.port', 3007);
  await app.listen(port);

  logger.log(`🚀 Integration service is running on: http://localhost:${port}`);
  logger.log(`📊 Metrics available at: http://localhost:${port}/metrics`);
  logger.log(`💚 Health check at: http://localhost:${port}/healthz`);
  logger.log(`📚 Swagger docs available at: http://localhost:${port}/docs`);
}

bootstrap();
