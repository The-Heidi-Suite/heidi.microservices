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

SERVICES=("auth" "users" "city" "core" "notification" "scheduler" "integration")

for service in "${SERVICES[@]}"; do
  echo ""
  echo "📦 Deploying migration for: $service"

  cd "libs/prisma-$service"

  # Check if database URL is set
  DB_URL_VAR="${service^^}_DATABASE_URL"
  if [ -z "${!DB_URL_VAR}" ]; then
    echo "❌ Error: $DB_URL_VAR not set in environment"
    cd ../..
    exit 1
  fi

  # Deploy migration
  if npx prisma migrate deploy --schema=./prisma/schema.prisma; then
    echo "✅ Migration for $service deployed successfully"
  else
    echo "❌ Migration deployment for $service failed"
    cd ../..
    exit 1
  fi

  cd ../..
done

echo ""
echo "🎉 All migrations deployed successfully to production!"
