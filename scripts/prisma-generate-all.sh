#!/bin/bash

# Script to generate all Prisma clients for each microservice
# This script must be run from the project root directory

set -e

echo "🔧 Generating Prisma Clients for all microservices..."
echo ""

SERVICES=("auth" "users" "city" "core" "notification" "scheduler" "integration")

for service in "${SERVICES[@]}"; do
  echo "📦 Generating Prisma client for: $service"
  cd "libs/prisma-$service"
  npx prisma generate --schema=./prisma/schema.prisma
  cd ../..
  echo "✅ Prisma client for $service generated successfully"
  echo ""
done

echo "🎉 All Prisma clients generated successfully!"
