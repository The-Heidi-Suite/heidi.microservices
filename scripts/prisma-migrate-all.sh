#!/bin/bash

# Script to run migrations for all microservice databases
# This script must be run from the project root directory
# Prerequisites:
# 1. PostgreSQL server must be running
# 2. All databases must exist (created automatically by Docker via infra/postgres/init-databases.sh)
# 3. .env file must be configured with all database URLs

set -e

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

echo "🗄️  Running migrations for all microservice databases..."
echo ""
echo "⚠️  This will apply schema changes to all databases."
if [[ -t 0 ]]; then
  read -p "Continue? (y/n): " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Migration cancelled."
    exit 0
  fi
fi

SERVICES=("auth" "users" "city" "core" "notification" "scheduler" "integration" "admin")

for service in "${SERVICES[@]}"; do
  echo ""
  echo "📦 Running migration for: $service"
  echo "Database: heidi_$service"

  # Check if database URL is set
  DB_URL_VAR="${service^^}_DATABASE_URL"
  if [ -z "${!DB_URL_VAR}" ]; then
    echo "⚠️  Warning: $DB_URL_VAR not set in environment"
    continue
  fi

  # Run migration
  SCHEMA_PATH="libs/prisma/src/schemas/$service.prisma"
  if npx prisma migrate dev --schema="$SCHEMA_PATH" --name init; then
    echo "✅ Migration for $service completed successfully"
  else
    echo "❌ Migration for $service failed"
    exit 1
  fi
done

echo ""
echo "🎉 All migrations completed successfully!"
echo ""
echo "💡 Next steps:"
echo "   - Verify migrations: npx prisma studio --schema=libs/prisma/src/schemas/<service>.prisma"
echo "   - Start microservices: docker compose up"
