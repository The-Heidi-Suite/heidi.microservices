import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class ConfigService {
  constructor(private configService: NestConfigService) {}

  get<T = any>(key: string, defaultValue?: T): T {
    if (defaultValue !== undefined) {
      return this.configService.get<T>(key, defaultValue);
    }
    return this.configService.get<T>(key) ?? (defaultValue as T);
  }

  getOrThrow<T = any>(key: string): T {
    return this.configService.getOrThrow<T>(key);
  }

  // Auth service configuration
  get authPort(): string {
    return this.get<string>('auth.port');
  }

  get authDatabaseConfig() {
    return {
      host: this.get<string>('auth.database.host'),
      port: this.get<number>('auth.database.port'),
      user: this.get<string>('auth.database.user'),
      password: this.get<string>('auth.database.password'),
      dbName: this.get<string>('auth.database.dbName'),
    };
  }

  // Users service configuration
  get usersPort(): string {
    return this.get<string>('users.port');
  }

  get usersDatabaseConfig() {
    return {
      host: this.get<string>('users.database.host'),
      port: this.get<number>('users.database.port'),
      user: this.get<string>('users.database.user'),
      password: this.get<string>('users.database.password'),
      dbName: this.get<string>('users.database.dbName'),
    };
  }

  // Core service configuration
  get corePort(): string {
    return this.get<string>('core.port');
  }

  get coreDatabaseConfig() {
    return {
      host: this.get<string>('core.database.host'),
      port: this.get<number>('core.database.port'),
      user: this.get<string>('core.database.user'),
      password: this.get<string>('core.database.password'),
      dbName: this.get<string>('core.database.dbName'),
    };
  }

  // City service configuration
  get cityPort(): string {
    return this.get<string>('city.port');
  }

  get cityDatabaseConfig() {
    return {
      host: this.get<string>('city.database.host'),
      port: this.get<number>('city.database.port'),
      user: this.get<string>('city.database.user'),
      password: this.get<string>('city.database.password'),
      dbName: this.get<string>('city.database.dbName'),
    };
  }

  // Notification service configuration
  get notificationPort(): string {
    return this.get<string>('notification.port');
  }

  get notificationDatabaseConfig() {
    return {
      host: this.get<string>('notification.database.host'),
      port: this.get<number>('notification.database.port'),
      user: this.get<string>('notification.database.user'),
      password: this.get<string>('notification.database.password'),
      dbName: this.get<string>('notification.database.dbName'),
    };
  }

  // Scheduler service configuration
  get schedulerPort(): string {
    return this.get<string>('scheduler.port');
  }

  get schedulerDatabaseConfig() {
    return {
      host: this.get<string>('scheduler.database.host'),
      port: this.get<number>('scheduler.database.port'),
      user: this.get<string>('scheduler.database.user'),
      password: this.get<string>('scheduler.database.password'),
      dbName: this.get<string>('scheduler.database.dbName'),
    };
  }

  // Integration service configuration
  get integrationPort(): string {
    return this.get<string>('integration.port');
  }

  get integrationDatabaseConfig() {
    return {
      host: this.get<string>('integration.database.host'),
      port: this.get<number>('integration.database.port'),
      user: this.get<string>('integration.database.user'),
      password: this.get<string>('integration.database.password'),
      dbName: this.get<string>('integration.database.dbName'),
    };
  }

  // JWT configuration
  get jwtSecret(): string {
    return this.getOrThrow<string>('jwt.secret');
  }

  get jwtExpiresIn(): string {
    return this.get<string>('jwt.expiresIn');
  }

  get jwtRefreshSecret(): string {
    return this.getOrThrow<string>('jwt.refreshSecret');
  }

  get jwtRefreshExpiresIn(): string {
    return this.get<string>('jwt.refreshExpiresIn');
  }

  // RabbitMQ configuration
  get rabbitmqConfig() {
    return {
      host: this.get<string>('rabbitmq.host'),
      port: this.get<number>('rabbitmq.port'),
      user: this.get<string>('rabbitmq.user'),
      password: this.get<string>('rabbitmq.password'),
      vhost: this.get<string>('rabbitmq.vhost'),
    };
  }

  // Redis configuration
  get redisConfig() {
    return {
      host: this.get<string>('redis.host'),
      port: this.get<number>('redis.port'),
      password: this.get<string>('redis.password'),
    };
  }

  // Swagger configuration
  get swaggerConfig() {
    return {
      title: this.get<string>('swagger.title'),
      description: this.get<string>('swagger.description'),
      version: this.get<string>('swagger.version'),
    };
  }

  // API prefix
  get apiPrefix(): string {
    return this.get<string>('apiPrefix');
  }

  // Email configuration
  get systemEmailId(): string {
    return this.get<string>('systemEmailId');
  }

  // Client URL
  get clientURL(): string {
    return this.get<string>('clientURL');
  }
}
