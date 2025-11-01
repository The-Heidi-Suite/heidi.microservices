#!/bin/bash

# HEIDI Microservices - Environment Setup Script
# This script creates .env and .env.example files

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}HEIDI Microservices - Environment Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Create .env.example
echo -e "${BLUE}Creating .env.example...${NC}"
cat > .env.example << 'EOF'
# ============================================================================
# HEIDI Microservices - Environment Configuration Template
# ============================================================================
# Copy this file to .env and update with your actual values
# ============================================================================

# Node Environment
NODE_ENV=development
SERVICE_VERSION=1.0.0

# PostgreSQL Server (Shared Instance)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=heidi
POSTGRES_PASSWORD=heidi_password
POSTGRES_DB=heidi_db

# Auth Service
AUTH_PORT=3001
AUTH_DB_NAME=heidi_auth
AUTH_DATABASE_URL=postgresql://heidi:heidi_password@localhost:5432/heidi_auth

# Users Service
USERS_PORT=3002
USERS_DB_NAME=heidi_users
USERS_DATABASE_URL=postgresql://heidi:heidi_password@localhost:5432/heidi_users

# City Service
CITY_PORT=3003
CITY_DB_NAME=heidi_city
CITY_DATABASE_URL=postgresql://heidi:heidi_password@localhost:5432/heidi_city

# Core Service
CORE_PORT=3004
CORE_DB_NAME=heidi_core
CORE_DATABASE_URL=postgresql://heidi:heidi_password@localhost:5432/heidi_core

# Notification Service
NOTIFICATION_PORT=3005
NOTIFICATION_DB_NAME=heidi_notification
NOTIFICATION_DATABASE_URL=postgresql://heidi:heidi_password@localhost:5432/heidi_notification

# Scheduler Service
SCHEDULER_PORT=3006
SCHEDULER_DB_NAME=heidi_scheduler
SCHEDULER_DATABASE_URL=postgresql://heidi:heidi_password@localhost:5432/heidi_scheduler

# Integration Service
INTEGRATION_PORT=3007
INTEGRATION_DB_NAME=heidi_integration
INTEGRATION_DATABASE_URL=postgresql://heidi:heidi_password@localhost:5432/heidi_integration

# Redis (Shared Cache)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_URL=redis://localhost:6379

# RabbitMQ (Shared Message Queue)
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=heidi
RABBITMQ_PASSWORD=heidi_password
RABBITMQ_VHOST=/
RABBITMQ_URL=amqp://heidi:heidi_password@localhost:5672

# JWT Configuration - CHANGE IN PRODUCTION!
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_REFRESH_EXPIRES_IN=7d

# Logging
LOG_LEVEL=debug

# API
API_PREFIX=api

# Swagger
SWAGGER_TITLE=HEIDI Microservices API
SWAGGER_DESCRIPTION=API documentation for HEIDI microservices
SWAGGER_VERSION=1.0

# Email/SMTP
SYSTEM_EMAIL_ID=noreply@heidi.example.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password

# Client URL
CLIENT_URL=http://localhost:4200

# Monitoring
SERVICE_NAME=heidi-service
METRICS_ENABLED=true

# Alerting (optional)
ALERT_WEBHOOK_URL=
ALERT_SMTP_HOST=smtp.gmail.com
ALERT_SMTP_PORT=587
ALERT_SMTP_USER=alerts@example.com
ALERT_SMTP_PASS=
ALERT_FROM_EMAIL=alerts@example.com
ALERT_TO_EMAILS=admin@example.com
ALERT_SLACK_WEBHOOK_URL=

# Docker Compose
COMPOSE_PROJECT_NAME=heidi
EOF

echo -e "${GREEN}✓ Created .env.example${NC}"

# Create .env if it doesn't exist
if [ -f .env ]; then
    echo -e "${YELLOW}⚠ .env already exists, skipping...${NC}"
else
    echo -e "${BLUE}Creating .env...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env${NC}"
    echo ""
    echo -e "${YELLOW}⚠ IMPORTANT: Update .env with your actual values!${NC}"
    echo -e "${YELLOW}  Especially change JWT_SECRET and JWT_REFRESH_SECRET${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Environment setup completed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Edit .env with your actual values"
echo -e "  2. Update JWT secrets with strong random values"
echo -e "  3. Configure database credentials if needed"
echo ""
echo -e "${BLUE}Generate random secrets:${NC}"
echo -e "  node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
echo ""
