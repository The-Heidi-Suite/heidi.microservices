#!/bin/bash
# PostgreSQL Database Auto-Initialization Script
# This script automatically creates all required databases for microservices
# Runs on first container startup via docker-entrypoint-initdb.d

set -e

# Database names for each microservice
DATABASES=(
    "heidi_auth"
    "heidi_users"
    "heidi_city"
    "heidi_core"
    "heidi_notification"
    "heidi_scheduler"
    "heidi_integration"
)

echo "========================================="
echo "HEIDI Microservices - Database Setup"
echo "========================================="
echo ""

# Create each database if it doesn't exist
for DB_NAME in "${DATABASES[@]}"; do
    echo "Creating database: $DB_NAME..."

    # Check if database exists (connect to postgres database)
    if psql -U "$POSTGRES_USER" -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1; then
        echo "  ✓ Database '$DB_NAME' already exists, skipping..."
    else
        psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres <<-EOSQL
            CREATE DATABASE $DB_NAME;
            COMMENT ON DATABASE $DB_NAME IS 'Database for HEIDI microservice';
EOSQL
        echo "  ✓ Database '$DB_NAME' created successfully"
    fi
done

echo ""
echo "========================================="
echo "All databases initialized successfully!"
echo "========================================="
echo ""

# List created databases
echo "Available databases:"
psql -U "$POSTGRES_USER" -d postgres -c "\l heidi_*"
