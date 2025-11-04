#!/bin/bash

# Script to deploy migrations to production for all microservice databases
# This script must be run from the project root directory
# Use this in production/CI environments

set -e

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Auto-detect if running from host (where postgres hostname doesn't resolve)
# If postgres hostname is used and we're on host, convert to localhost
if ! ping -c 1 postgres >/dev/null 2>&1; then
  echo "⚠️  Running from host machine - converting postgres:5432 to localhost:5432"
  export AUTH_DATABASE_URL=$(echo ${AUTH_DATABASE_URL:-} | sed 's/@postgres:5432/@localhost:5432/')
  export USERS_DATABASE_URL=$(echo ${USERS_DATABASE_URL:-} | sed 's/@postgres:5432/@localhost:5432/')
  export CITY_DATABASE_URL=$(echo ${CITY_DATABASE_URL:-} | sed 's/@postgres:5432/@localhost:5432/')
  export CORE_DATABASE_URL=$(echo ${CORE_DATABASE_URL:-} | sed 's/@postgres:5432/@localhost:5432/')
  export NOTIFICATION_DATABASE_URL=$(echo ${NOTIFICATION_DATABASE_URL:-} | sed 's/@postgres:5432/@localhost:5432/')
  export SCHEDULER_DATABASE_URL=$(echo ${SCHEDULER_DATABASE_URL:-} | sed 's/@postgres:5432/@localhost:5432/')
  export INTEGRATION_DATABASE_URL=$(echo ${INTEGRATION_DATABASE_URL:-} | sed 's/@postgres:5432/@localhost:5432/')
  export ADMIN_DATABASE_URL=$(echo ${ADMIN_DATABASE_URL:-} | sed 's/@postgres:5432/@localhost:5432/')
fi

echo "🚀 Deploying migrations to production for all microservice databases..."
echo ""

# Active microservices
ACTIVE_SERVICES=("auth" "users" "city" "core" "notification" "scheduler" "integration" "admin")

# FUTURE SERVICES - Uncomment to include when activating
# FUTURE_SERVICES=("terminal")

# Use ACTIVE_SERVICES by default, or combine if FUTURE_SERVICES are uncommented
SERVICES=("${ACTIVE_SERVICES[@]}")
# Uncomment below to include future services:
# SERVICES=("${ACTIVE_SERVICES[@]}" "${FUTURE_SERVICES[@]}")

for service in "${SERVICES[@]}"; do
  echo ""
  echo "📦 Deploying migration for: $service"

  # Check if database URL is set
  DB_URL_VAR="${service^^}_DATABASE_URL"
  if [ -z "${!DB_URL_VAR}" ]; then
    echo "❌ Error: $DB_URL_VAR not set in environment"
    exit 1
  fi

  # Deploy migration from centralized schema path
  SCHEMA_PATH="libs/prisma/src/schemas/$service.prisma"
  if [ ! -f "$SCHEMA_PATH" ]; then
    echo "❌ Error: schema not found at $SCHEMA_PATH"
    exit 1
  fi

  if npx prisma migrate deploy --schema="$SCHEMA_PATH"; then
    echo "✅ Migration for $service deployed successfully"
  else
    echo "❌ Migration deployment for $service failed"
    exit 1
  fi
done

echo ""
echo "🎉 All migrations deployed successfully to production!"
