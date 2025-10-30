export default () => ({
  // Shared PostgreSQL server configuration
  // All microservices use the same PostgreSQL server but different databases
  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    user: process.env.POSTGRES_USER || 'heidi',
    password: process.env.POSTGRES_PASSWORD || 'heidi_password',
  },

  // Auth microservice configuration
  auth: {
    port: parseInt(process.env.AUTH_PORT || '3001', 10),
    database: {
      name: process.env.AUTH_DB_NAME || 'heidi_auth',
      url:
        process.env.AUTH_DATABASE_URL ||
        `postgresql://${process.env.POSTGRES_USER || 'heidi'}:${process.env.POSTGRES_PASSWORD || 'heidi_password'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.AUTH_DB_NAME || 'heidi_auth'}`,
    },
  },

  // Users microservice configuration
  users: {
    port: parseInt(process.env.USERS_PORT || '3002', 10),
    database: {
      name: process.env.USERS_DB_NAME || 'heidi_users',
      url:
        process.env.USERS_DATABASE_URL ||
        `postgresql://${process.env.POSTGRES_USER || 'heidi'}:${process.env.POSTGRES_PASSWORD || 'heidi_password'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.USERS_DB_NAME || 'heidi_users'}`,
    },
  },

  // City microservice configuration
  city: {
    port: parseInt(process.env.CITY_PORT || '3003', 10),
    database: {
      name: process.env.CITY_DB_NAME || 'heidi_city',
      url:
        process.env.CITY_DATABASE_URL ||
        `postgresql://${process.env.POSTGRES_USER || 'heidi'}:${process.env.POSTGRES_PASSWORD || 'heidi_password'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.CITY_DB_NAME || 'heidi_city'}`,
    },
  },

  // Core microservice configuration
  core: {
    port: parseInt(process.env.CORE_PORT || '3004', 10),
    database: {
      name: process.env.CORE_DB_NAME || 'heidi_core',
      url:
        process.env.CORE_DATABASE_URL ||
        `postgresql://${process.env.POSTGRES_USER || 'heidi'}:${process.env.POSTGRES_PASSWORD || 'heidi_password'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.CORE_DB_NAME || 'heidi_core'}`,
    },
  },

  // Notification microservice configuration
  notification: {
    port: parseInt(process.env.NOTIFICATION_PORT || '3005', 10),
    database: {
      name: process.env.NOTIFICATION_DB_NAME || 'heidi_notification',
      url:
        process.env.NOTIFICATION_DATABASE_URL ||
        `postgresql://${process.env.POSTGRES_USER || 'heidi'}:${process.env.POSTGRES_PASSWORD || 'heidi_password'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.NOTIFICATION_DB_NAME || 'heidi_notification'}`,
    },
  },

  // Scheduler microservice configuration
  scheduler: {
    port: parseInt(process.env.SCHEDULER_PORT || '3006', 10),
    database: {
      name: process.env.SCHEDULER_DB_NAME || 'heidi_scheduler',
      url:
        process.env.SCHEDULER_DATABASE_URL ||
        `postgresql://${process.env.POSTGRES_USER || 'heidi'}:${process.env.POSTGRES_PASSWORD || 'heidi_password'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.SCHEDULER_DB_NAME || 'heidi_scheduler'}`,
    },
  },

  // Integration microservice configuration
  integration: {
    port: parseInt(process.env.INTEGRATION_PORT || '3007', 10),
    database: {
      name: process.env.INTEGRATION_DB_NAME || 'heidi_integration',
      url:
        process.env.INTEGRATION_DATABASE_URL ||
        `postgresql://${process.env.POSTGRES_USER || 'heidi'}:${process.env.POSTGRES_PASSWORD || 'heidi_password'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.INTEGRATION_DB_NAME || 'heidi_integration'}`,
    },
  },

  // API configuration
  apiPrefix: process.env.API_PREFIX || 'api',

  // Swagger configuration
  swagger: {
    title: process.env.SWAGGER_TITLE || 'HEIDI Microservices API',
    description: process.env.SWAGGER_DESCRIPTION || 'API documentation for HEIDI microservices',
    version: process.env.SWAGGER_VERSION || '1.0',
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // RabbitMQ configuration
  rabbitmq: {
    host: process.env.RABBITMQ_HOST || 'localhost',
    port: parseInt(process.env.RABBITMQ_PORT || '5672', 10),
    user: process.env.RABBITMQ_USER || 'guest',
    password: process.env.RABBITMQ_PASSWORD || 'guest',
    vhost: process.env.RABBITMQ_VHOST || '/',
  },

  // Redis configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
  },

  // Email configuration
  systemEmailId: process.env.SYSTEM_EMAIL_ID,

  // Client URL
  clientURL: process.env.CLIENT_URL,
});
