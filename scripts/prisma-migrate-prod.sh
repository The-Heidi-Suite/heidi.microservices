#!/bin/bash

# Script to deploy migrations to production for all microservice databases
# This script must be run from the project root directory
# Use this in production/CI environments

set -e

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
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
