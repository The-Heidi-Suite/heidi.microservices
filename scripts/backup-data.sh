#!/bin/bash

# HEIDI Microservices - Infrastructure Data Backup Script
# This script backs up all infrastructure data from ./data/ directory

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/backup_$TIMESTAMP"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}HEIDI Infrastructure Data Backup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Create backup directory
mkdir -p "$BACKUP_PATH"

# Check if data directory exists
if [ ! -d "./data" ]; then
  echo -e "${YELLOW}⚠️  ./data directory not found. No data to backup.${NC}"
  exit 0
fi

echo -e "${BLUE}📦 Backing up infrastructure data to: ${BACKUP_PATH}${NC}"
echo ""

# Backup PostgreSQL
if [ -d "./data/postgres" ] && [ "$(ls -A ./data/postgres 2>/dev/null)" ]; then
  echo -e "${GREEN}  → PostgreSQL...${NC}"
  tar -czf "$BACKUP_PATH/postgres.tar.gz" -C ./data postgres 2>/dev/null || {
    echo -e "${YELLOW}    ⚠️  PostgreSQL backup skipped (may be in use)${NC}"
  }
else
  echo -e "${YELLOW}  → PostgreSQL (empty or not found, skipping)${NC}"
fi

# Backup Redis
if [ -d "./data/redis" ] && [ "$(ls -A ./data/redis 2>/dev/null)" ]; then
  echo -e "${GREEN}  → Redis...${NC}"
  tar -czf "$BACKUP_PATH/redis.tar.gz" -C ./data redis 2>/dev/null || {
    echo -e "${YELLOW}    ⚠️  Redis backup skipped (may be in use)${NC}"
  }
else
  echo -e "${YELLOW}  → Redis (empty or not found, skipping)${NC}"
fi

# Backup RabbitMQ
if [ -d "./data/rabbitmq" ] && [ "$(ls -A ./data/rabbitmq 2>/dev/null)" ]; then
  echo -e "${GREEN}  → RabbitMQ...${NC}"
  tar -czf "$BACKUP_PATH/rabbitmq.tar.gz" -C ./data rabbitmq 2>/dev/null || {
    echo -e "${YELLOW}    ⚠️  RabbitMQ backup skipped (may be in use)${NC}"
  }
else
  echo -e "${YELLOW}  → RabbitMQ (empty or not found, skipping)${NC}"
fi

# Backup Prometheus
if [ -d "./data/prometheus" ] && [ "$(ls -A ./data/prometheus 2>/dev/null)" ]; then
  echo -e "${GREEN}  → Prometheus...${NC}"
  tar -czf "$BACKUP_PATH/prometheus.tar.gz" -C ./data prometheus 2>/dev/null || {
    echo -e "${YELLOW}    ⚠️  Prometheus backup skipped (may be in use)${NC}"
  }
else
  echo -e "${YELLOW}  → Prometheus (empty or not found, skipping)${NC}"
fi

# Backup Alertmanager
if [ -d "./data/alertmanager" ] && [ "$(ls -A ./data/alertmanager 2>/dev/null)" ]; then
  echo -e "${GREEN}  → Alertmanager...${NC}"
  tar -czf "$BACKUP_PATH/alertmanager.tar.gz" -C ./data alertmanager 2>/dev/null || {
    echo -e "${YELLOW}    ⚠️  Alertmanager backup skipped (may be in use)${NC}"
  }
else
  echo -e "${YELLOW}  → Alertmanager (empty or not found, skipping)${NC}"
fi

# Backup Grafana
if [ -d "./data/grafana" ] && [ "$(ls -A ./data/grafana 2>/dev/null)" ]; then
  echo -e "${GREEN}  → Grafana...${NC}"
  tar -czf "$BACKUP_PATH/grafana.tar.gz" -C ./data grafana 2>/dev/null || {
    echo -e "${YELLOW}    ⚠️  Grafana backup skipped (may be in use)${NC}"
  }
else
  echo -e "${YELLOW}  → Grafana (empty or not found, skipping)${NC}"
fi

# Backup pgAdmin
if [ -d "./data/pgadmin" ] && [ "$(ls -A ./data/pgadmin 2>/dev/null)" ]; then
  echo -e "${GREEN}  → pgAdmin...${NC}"
  tar -czf "$BACKUP_PATH/pgadmin.tar.gz" -C ./data pgadmin 2>/dev/null || {
    echo -e "${YELLOW}    ⚠️  pgAdmin backup skipped (may be in use)${NC}"
  }
else
  echo -e "${YELLOW}  → pgAdmin (empty or not found, skipping)${NC}"
fi

# Backup Caddy
if [ -d "./data/caddy" ] && [ "$(ls -A ./data/caddy 2>/dev/null)" ]; then
  echo -e "${GREEN}  → Caddy...${NC}"
  tar -czf "$BACKUP_PATH/caddy.tar.gz" -C ./data caddy 2>/dev/null || {
    echo -e "${YELLOW}    ⚠️  Caddy backup skipped (may be in use)${NC}"
  }
else
  echo -e "${YELLOW}  → Caddy (empty or not found, skipping)${NC}"
fi

# Backup Caddy Config
if [ -d "./data/caddy-config" ] && [ "$(ls -A ./data/caddy-config 2>/dev/null)" ]; then
  echo -e "${GREEN}  → Caddy Config...${NC}"
  tar -czf "$BACKUP_PATH/caddy-config.tar.gz" -C ./data caddy-config 2>/dev/null || {
    echo -e "${YELLOW}    ⚠️  Caddy Config backup skipped (may be in use)${NC}"
  }
else
  echo -e "${YELLOW}  → Caddy Config (empty or not found, skipping)${NC}"
fi

echo ""
if [ -d "$BACKUP_PATH" ] && [ "$(ls -A "$BACKUP_PATH" 2>/dev/null)" ]; then
  TOTAL_SIZE=$(du -sh "$BACKUP_PATH" 2>/dev/null | cut -f1)
  echo -e "${GREEN}✅ Backup complete!${NC}"
  echo -e "${GREEN}   Location: ${BACKUP_PATH}${NC}"
  echo -e "${GREEN}   Total size: ${TOTAL_SIZE}${NC}"
  echo ""
  echo -e "${BLUE}💡 Tip: To restore, extract the .tar.gz files to ./data/ directory${NC}"
else
  echo -e "${YELLOW}⚠️  No data was backed up (all directories were empty or not found)${NC}"
fi
