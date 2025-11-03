import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@heidi/config';
import { PrismaClient as PrismaUsersClient } from '@prisma/client-users';
import { LoggerService } from '@heidi/logger';

@Injectable()
export class PrismaUsersService extends PrismaUsersClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger: LoggerService;

  constructor(logger: LoggerService, configService: ConfigService) {
    // Explicitly pass datasourceUrl to ensure we use the correct database connection
    // This prevents Prisma from reading a wrong DATABASE_URL at runtime
    const databaseUrl = configService.get<string>('users.database.url');
    if (!databaseUrl) {
      throw new Error('USERS_DATABASE_URL is not configured');
    }

    // Extract database name from URL for logging (mask password)
    const urlWithoutPassword = databaseUrl.replace(/:[^:@]+@/, ':****@');
    logger.setContext('PrismaUsersService');
    logger.log(`Connecting to database: ${urlWithoutPassword}`);

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
    this.logger.setContext('PrismaUsersService');
    // Development query logging
    const isDevelopment = configService.get<string>('nodeEnv', 'development') === 'development';
    if (isDevelopment) {
      this.$on('query' as never, (e: any) => {
        this.logger.debug(`Query: ${e.query} - Duration: ${e.duration}ms`);
      });
    }
    // Log errors (only message, not full stack for known errors)
    this.$on('error' as never, (e: any) => {
      // Prisma errors are usually known errors (constraints, etc.) - log message only
      this.logger.error(`Prisma Error: ${e.message}`, undefined, {
        operation: 'database_error',
        service: 'Users-Service',
      });
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      // Verify which database we're connected to
      const result = await this.$queryRaw<Array<{ current_database: string }>>`
        SELECT current_database();
      `;
      const dbName = result[0]?.current_database;
      this.logger.log(`PrismaUsersService: Connected to database '${dbName}'`);
    } catch (error) {
      this.logger.error('PrismaUsersService: Failed to connect to database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('PrismaUsersService: Disconnected from database');
    } catch (error) {
      this.logger.error('PrismaUsersService: Error disconnecting from database', error);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('PrismaUsersService: Health check failed', error);
      return false;
    }
  }
}
