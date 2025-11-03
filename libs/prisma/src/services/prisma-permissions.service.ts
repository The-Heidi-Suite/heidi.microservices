import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient as PrismaPermissionsClient } from '@prisma/client-permissions';
import { LoggerService } from '@heidi/logger';

@Injectable()
export class PrismaPermissionsService
  extends PrismaPermissionsClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger: LoggerService;

  constructor(logger: LoggerService, configService: ConfigService) {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
      errorFormat: 'colorless',
    });
    this.logger = logger;
    this.logger.setContext('PrismaPermissionsService');
    // Development query logging
    const isDevelopment = configService.get<string>('NODE_ENV', 'development') === 'development';
    if (isDevelopment) {
      this.$on('query' as never, (e: any) => {
        this.logger.debug(`Query: ${e.query} - Duration: ${e.duration}ms`);
      });
    }
    // Log errors
    this.$on('error' as never, (e: any) => {
      this.logger.error(`Prisma Error: ${e.message}`);
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('PrismaPermissionsService: Connected to database');
    } catch (error) {
      this.logger.error('PrismaPermissionsService: Failed to connect to database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('PrismaPermissionsService: Disconnected from database');
    } catch (error) {
      this.logger.error('PrismaPermissionsService: Error disconnecting from database', error);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('PrismaPermissionsService: Health check failed', error);
      return false;
    }
  }
}
