# Environment Variables Guide

This document lists all environment variables used across the HEIDI microservices platform.

## 📋 Quick Start

Copy this template to create your `.env` file:

```bash
cp docs/ENVIRONMENT_VARIABLES.md .env
# Then edit .env with your actual values
```

---

## 🗄️ Database Configuration

### PostgreSQL Server (Shared)

All microservices connect to the same PostgreSQL server but use separate databases.

```bash
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=heidi
POSTGRES_PASSWORD=heidi_password
```

### Per-Service Databases

Each microservice has its own database:

#### Auth Service

```bash
AUTH_PORT=3001
AUTH_DB_NAME=heidi_auth
AUTH_DATABASE_URL=postgresql://heidi:heidi_password@localhost:5432/heidi_auth
```

#### Users Service

```bash
USERS_PORT=3002
USERS_DB_NAME=heidi_users
USERS_DATABASE_URL=postgresql://heidi:heidi_password@localhost:5432/heidi_users
```

#### City Service

```bash
CITY_PORT=3003
CITY_DB_NAME=heidi_city
CITY_DATABASE_URL=postgresql://heidi:heidi_password@localhost:5432/heidi_city
```

#### Core Service

```bash
CORE_PORT=3004
CORE_DB_NAME=heidi_core
CORE_DATABASE_URL=postgresql://heidi:heidi_password@localhost:5432/heidi_core
```

#### Notification Service

```bash
NOTIFICATION_PORT=3005
NOTIFICATION_DB_NAME=heidi_notification
NOTIFICATION_DATABASE_URL=postgresql://heidi:heidi_password@localhost:5432/heidi_notification
```

#### Scheduler Service

```bash
SCHEDULER_PORT=3006
SCHEDULER_DB_NAME=heidi_scheduler
SCHEDULER_DATABASE_URL=postgresql://heidi:heidi_password@localhost:5432/heidi_scheduler
```

#### Integration Service

```bash
INTEGRATION_PORT=3007
INTEGRATION_DB_NAME=heidi_integration
INTEGRATION_DATABASE_URL=postgresql://heidi:heidi_password@localhost:5432/heidi_integration
```

---

## 🔄 Shared Infrastructure

### Redis (Shared Cache)

All microservices share the same Redis instance for caching.

```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_URL=redis://localhost:6379
```

### RabbitMQ (Shared Message Queue)

All microservices share the same RabbitMQ instance for messaging.

```bash
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=heidi
RABBITMQ_PASSWORD=heidi_password
RABBITMQ_VHOST=/
RABBITMQ_URL=amqp://heidi:heidi_password@localhost:5672
```

---

## 🔐 Security & Authentication

### JWT Configuration

**⚠️ IMPORTANT: Change these secrets in production!**

```bash
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_REFRESH_EXPIRES_IN=7d
```

---

## 📊 Monitoring & Observability

### General Configuration

```bash
SERVICE_NAME=heidi-service
SERVICE_VERSION=1.0.0
LOG_LEVEL=debug
METRICS_ENABLED=true
```

### Alert Configuration

```bash
# Webhook for alerts
ALERT_WEBHOOK_URL=https://your-webhook-endpoint.com/alerts

# Email alerts
ALERT_SMTP_HOST=smtp.gmail.com
ALERT_SMTP_PORT=587
ALERT_SMTP_USER=alerts@example.com
ALERT_SMTP_PASS=your-password
ALERT_FROM_EMAIL=alerts@example.com
ALERT_TO_EMAILS=admin1@example.com,admin2@example.com

# Slack alerts
ALERT_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

---

## 🌐 API & Application

### General Settings

```bash
NODE_ENV=development
API_PREFIX=api
CLIENT_URL=http://localhost:4200
```

### Swagger Documentation

```bash
SWAGGER_TITLE=HEIDI Microservices API
SWAGGER_DESCRIPTION=API documentation for HEIDI microservices
SWAGGER_VERSION=1.0
```

### Email Configuration

```bash
SYSTEM_EMAIL_ID=noreply@heidi.example.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

---

## 🔧 Development Configuration

For local development, you may want to enable additional logging:

```bash
DEBUG=*
PRISMA_LOG_LEVEL=query,info,warn,error
```

---

## 🚀 Production Configuration

For production deployments, ensure you:

### ✅ Security Checklist

- [ ] Change all default passwords and secrets
- [ ] Use strong, randomly generated JWT secrets
- [ ] Enable SSL/TLS for database connections
- [ ] Use secure Redis connections (rediss://)
- [ ] Use secure RabbitMQ connections (amqps://)
- [ ] Configure proper CORS settings
- [ ] Enable rate limiting
- [ ] Set up proper monitoring and alerting

### Production Database URLs

Use SSL-enabled connection strings:

```bash
AUTH_DATABASE_URL=postgresql://user:pass@prod-db.example.com:5432/heidi_auth?sslmode=require
USERS_DATABASE_URL=postgresql://user:pass@prod-db.example.com:5432/heidi_users?sslmode=require
CITY_DATABASE_URL=postgresql://user:pass@prod-db.example.com:5432/heidi_city?sslmode=require
CORE_DATABASE_URL=postgresql://user:pass@prod-db.example.com:5432/heidi_core?sslmode=require
NOTIFICATION_DATABASE_URL=postgresql://user:pass@prod-db.example.com:5432/heidi_notification?sslmode=require
SCHEDULER_DATABASE_URL=postgresql://user:pass@prod-db.example.com:5432/heidi_scheduler?sslmode=require
INTEGRATION_DATABASE_URL=postgresql://user:pass@prod-db.example.com:5432/heidi_integration?sslmode=require
```

### Production Redis

```bash
REDIS_URL=rediss://user:pass@prod-redis.example.com:6380?tls=true
```

### Production RabbitMQ

```bash
RABBITMQ_URL=amqps://user:pass@prod-rabbitmq.example.com:5671?heartbeat=60
```

---

## 📝 Environment Variable Priority

The configuration system follows this priority order:

1. **Environment variables** (highest priority)
2. **`.env` file** values
3. **Default values** in `libs/config/src/configuration.ts` (lowest priority)

---

## 🔍 Validation

Required variables that **must** be set:

- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- At least one service's `DATABASE_URL` (depending on which services you're running)

Optional but recommended:

- Alert configuration (email, webhook, Slack)
- SMTP configuration for email notifications
- Monitoring service name

---

## 💡 Tips

### Per-Service Environment Variables

If you run services separately, each service only needs:

1. Its own `{SERVICE}_DATABASE_URL`
2. Shared infrastructure variables (Redis, RabbitMQ, JWT secrets)
3. Service-specific port

Example for running only Auth service:

```bash
AUTH_PORT=3001
AUTH_DATABASE_URL=postgresql://heidi:heidi_password@localhost:5432/heidi_auth
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://localhost:5672
JWT_SECRET=your-secret
JWT_REFRESH_SECRET=your-refresh-secret
```

### Docker Compose

When using Docker Compose, you can use service names as hostnames:

```bash
POSTGRES_HOST=postgres
REDIS_HOST=redis
RABBITMQ_HOST=rabbitmq
```

### Connection String Format

PostgreSQL URL format:

```
postgresql://[user[:password]@][host][:port][/dbname][?param1=value1&...]
```

Examples:

```bash
# Basic
postgresql://localhost/mydb

# With auth
postgresql://user:password@localhost/mydb

# With port
postgresql://user:password@localhost:5432/mydb

# With SSL
postgresql://user:password@localhost:5432/mydb?sslmode=require

# Connection pool settings
postgresql://user:password@localhost:5432/mydb?pool_timeout=10&pool_size=20
```

---

## 🆘 Troubleshooting

### Database Connection Issues

If you get connection errors:

1. Check database is running: `docker ps` or `pg_isready -h localhost`
2. Verify credentials match
3. Ensure database exists: `psql -h localhost -U heidi -l`
4. Check firewall/network settings

### Redis Connection Issues

```bash
# Test Redis connection
redis-cli -h localhost -p 6379 ping
# Should return: PONG
```

### RabbitMQ Connection Issues

```bash
# Check RabbitMQ status
rabbitmqctl status

# Check if queues are accessible
rabbitmqctl list_queues
```

---

**Last Updated:** 2025-10-30
