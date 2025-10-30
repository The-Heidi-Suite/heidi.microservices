#!/bin/bash

# HEIDI Microservices - Create All Databases
# This script creates all databases for the microservices

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables from .env if it exists
if [ -f .env ]; then
    echo -e "${BLUE}Loading environment variables from .env${NC}"
    export $(cat .env | grep -v '^#' | xargs)
fi

# Default values
DB_HOST=${POSTGRES_HOST:-localhost}
DB_PORT=${POSTGRES_PORT:-5432}
DB_USER=${POSTGRES_USER:-heidi}
DB_PASSWORD=${POSTGRES_PASSWORD:-heidi_password}

# Database names
DATABASES=(
    "${AUTH_DB_NAME:-heidi_auth}"
    "${USERS_DB_NAME:-heidi_users}"
    "${CITY_DB_NAME:-heidi_city}"
    "${CORE_DB_NAME:-heidi_core}"
    "${NOTIFICATION_DB_NAME:-heidi_notification}"
    "${SCHEDULER_DB_NAME:-heidi_scheduler}"
    "${INTEGRATION_DB_NAME:-heidi_integration}"
)

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}HEIDI Microservices - Database Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo -e "  Host: ${DB_HOST}"
echo -e "  Port: ${DB_PORT}"
echo -e "  User: ${DB_USER}"
echo ""

# Check if PostgreSQL is accessible
echo -e "${BLUE}Checking PostgreSQL connection...${NC}"
if ! PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${RED}❌ Failed to connect to PostgreSQL${NC}"
    echo -e "${YELLOW}Please ensure PostgreSQL is running and credentials are correct${NC}"
    exit 1
fi
echo -e "${GREEN}✓ PostgreSQL connection successful${NC}"
echo ""

# Create each database
echo -e "${BLUE}Creating databases...${NC}"
for DB_NAME in "${DATABASES[@]}"; do
    echo -n "  Creating database: ${DB_NAME}... "

    # Check if database already exists
    if PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        echo -e "${YELLOW}already exists${NC}"
    else
        # Create database
        if PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ created${NC}"
        else
            echo -e "${RED}❌ failed${NC}"
        fi
    fi
done

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Database setup completed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Run Prisma migrations for each service"
echo -e "  2. Verify databases: psql -h $DB_HOST -p $DB_PORT -U $DB_USER -l"
echo ""
