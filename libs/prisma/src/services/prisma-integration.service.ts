import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@heidi/config';
import { PrismaClient as PrismaIntegrationClient } from '@prisma/client-integration';
import { LoggerService } from '@heidi/logger';

@Injectable()
export class PrismaIntegrationService
  extends PrismaIntegrationClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger: LoggerService;

  constructor(logger: LoggerService, configService: ConfigService) {
    // Explicitly pass datasourceUrl to ensure we use the correct database connection
    const databaseUrl = configService.get<string>('integration.database.url');
    if (!databaseUrl) {
      throw new Error('INTEGRATION_DATABASE_URL is not configured');
    }

    super({
      datasourceUrl: databaseUrl,
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
      errorFormat: 'colorless',
    });
    this.logger = logger;
    this.logger.setContext('PrismaIntegrationService');
    // Development query logging
    const isDevelopment = configService.get<string>('nodeEnv', 'development') === 'development';
    if (isDevelopment) {
      this.$on('query' as never, (e: any) => {
        this.logger.debug(`Query: ${e.query} - Duration: ${e.duration}ms`);
      });
    }
    // Log errors (only message, not full stack for known errors)
    this.$on('error' as never, (e: any) => {
      this.logger.error(`Prisma Error: ${e.message}`, undefined, {
        operation: 'database_error',
        service: 'Integration-Service',
      });
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
    } catch (error) {
      this.logger.error('PrismaIntegrationService: Failed to connect to database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('PrismaIntegrationService: Disconnected from database');
    } catch (error) {
      this.logger.error('PrismaIntegrationService: Error disconnecting from database', error);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('PrismaIntegrationService: Health check failed', error);
      return false;
    }
  }
}
