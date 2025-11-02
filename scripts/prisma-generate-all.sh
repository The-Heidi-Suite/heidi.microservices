#!/bin/bash

# Script to generate all Prisma clients for each microservice
# This script must be run from the project root directory

set -e

echo "🔧 Generating Prisma Clients for all microservices..."
echo ""

SERVICES=("auth" "users" "city" "core" "notification" "scheduler" "integration" "admin" "terminal")

for service in "${SERVICES[@]}"; do
  echo "📦 Generating Prisma client for: $service"
  SCHEMA_PATH="libs/prisma/src/schemas/$service.prisma"
  if [ ! -f "$SCHEMA_PATH" ]; then
    echo "⚠️  Skipping $service: schema not found at $SCHEMA_PATH"
    continue
  fi
  npx prisma generate --schema="$SCHEMA_PATH"
  echo "✅ Prisma client for $service generated successfully"
  echo ""
done

echo "🎉 All Prisma clients generated successfully!"
