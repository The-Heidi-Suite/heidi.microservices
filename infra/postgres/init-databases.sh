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
    "heidi_admin"
)

echo "========================================="
echo "HEIDI Microservices - Database Setup"
echo "========================================="
echo ""

# Ensure default database exists (from POSTGRES_DB env var, or create heidi_db as fallback)
DEFAULT_DB="${POSTGRES_DB:-heidi_db}"
if ! psql -U "$POSTGRES_USER" -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$DEFAULT_DB'" | grep -q 1; then
    echo "Creating default database: $DEFAULT_DB..."
    psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres <<-EOSQL
        CREATE DATABASE $DEFAULT_DB;
EOSQL
    echo "  ✓ Default database '$DEFAULT_DB' created successfully"
    echo ""
fi

# Create database matching username to prevent connection errors
# (PostgreSQL defaults to username as database name when not specified)
if [ "$POSTGRES_USER" != "postgres" ] && ! psql -U "$POSTGRES_USER" -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$POSTGRES_USER'" | grep -q 1; then
    echo "Creating user database: $POSTGRES_USER (for default connections)..."
    psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres <<-EOSQL
        CREATE DATABASE "$POSTGRES_USER";
EOSQL
    echo "  ✓ User database '$POSTGRES_USER' created successfully"
    echo ""
fi

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
