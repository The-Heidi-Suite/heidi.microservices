export default () => ({
  // Auth microservice configuration
  auth: {
    port: process.env.AUTH_TCP_PORT,
    database: {
      host: process.env.MONGODB_HOST || 'localhost',
      port: parseInt(process.env.MONGODB_PORT, 10) || 27017,
      user: process.env.AUTH_MONGODB_USER || '',
      password: process.env.AUTH_MONGODB_PASSWORD || '',
      dbName: process.env.AUTH_MONGODB_DBNAME || 'heidi_suite',
    },
  },

  // Users microservice configuration
  users: {
    port: process.env.USERS_TCP_PORT,
    database: {
      host: process.env.MONGODB_HOST || 'localhost',
      port: parseInt(process.env.MONGODB_PORT, 10) || 27017,
      user: process.env.USERS_MONGODB_USER || '',
      password: process.env.USERS_MONGODB_PASSWORD || '',
      dbName: process.env.USERS_MONGODB_DBNAME || 'heidi_suite',
    },
  },

  // Core microservice configuration
  core: {
    port: process.env.CORE_TCP_PORT,
    database: {
      host: process.env.MONGODB_HOST || 'localhost',
      port: parseInt(process.env.MONGODB_PORT, 10) || 27017,
      user: process.env.CORE_MONGODB_USER || '',
      password: process.env.CORE_MONGODB_PASSWORD || '',
      dbName: process.env.CORE_MONGODB_DBNAME || 'heidi_suite',
    },
  },

  // City microservice configuration
  city: {
    port: process.env.CITY_TCP_PORT,
    database: {
      host: process.env.MONGODB_HOST || 'localhost',
      port: parseInt(process.env.MONGODB_PORT, 10) || 27017,
      user: process.env.CITY_MONGODB_USER || '',
      password: process.env.CITY_MONGODB_PASSWORD || '',
      dbName: process.env.CITY_MONGODB_DBNAME || 'heidi_suite',
    },
  },

  // Notification microservice configuration
  notification: {
    port: process.env.NOTIFICATION_TCP_PORT,
    database: {
      host: process.env.MONGODB_HOST || 'localhost',
      port: parseInt(process.env.MONGODB_PORT, 10) || 27017,
      user: process.env.NOTIFICATION_MONGODB_USER || '',
      password: process.env.NOTIFICATION_MONGODB_PASSWORD || '',
      dbName: process.env.NOTIFICATION_MONGODB_DBNAME || 'heidi_suite',
    },
  },

  // Scheduler microservice configuration
  scheduler: {
    port: process.env.SCHEDULER_TCP_PORT,
    database: {
      host: process.env.MONGODB_HOST || 'localhost',
      port: parseInt(process.env.MONGODB_PORT, 10) || 27017,
      user: process.env.SCHEDULER_MONGODB_USER || '',
      password: process.env.SCHEDULER_MONGODB_PASSWORD || '',
      dbName: process.env.SCHEDULER_MONGODB_DBNAME || 'heidi_suite',
    },
  },

  // Integration microservice configuration
  integration: {
    port: process.env.INTEGRATION_TCP_PORT,
    database: {
      host: process.env.MONGODB_HOST || 'localhost',
      port: parseInt(process.env.MONGODB_PORT, 10) || 27017,
      user: process.env.INTEGRATION_MONGODB_USER || '',
      password: process.env.INTEGRATION_MONGODB_PASSWORD || '',
      dbName: process.env.INTEGRATION_MONGODB_DBNAME || 'heidi_suite',
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
    port: parseInt(process.env.RABBITMQ_PORT, 10) || 5672,
    user: process.env.RABBITMQ_USER || 'guest',
    password: process.env.RABBITMQ_PASSWORD || 'guest',
    vhost: process.env.RABBITMQ_VHOST || '/',
  },

  // Redis configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || '',
  },

  // Email configuration
  systemEmailId: process.env.SYSTEM_EMAIL_ID,

  // Client URL
  clientURL: process.env.CLIENT_URL,
});
