# Future Services

This document lists microservices that are implemented but not yet active in production.

## Terminal Service

**Status:** Implemented but inactive (Future Service)

**Purpose:** Managing city terminals for the HEIDI platform.

**Port:** 3009

**Database:** `heidi_terminal`

### Activation Steps

When ready to activate the terminal service:

#### 1. Docker Compose

The terminal service uses a Docker Compose profile. To activate:

```bash
# Start terminal service with profile
docker compose --profile future up terminal

# Or include it in your normal compose command
docker compose --profile future up
```

Or manually uncomment the `profiles: ["future"]` line in `docker-compose.yml`.

#### 2. Update Nginx Configuration

Uncomment the terminal service blocks in `infra/nginx/nginx.conf`:

- Uncomment `upstream terminal_backend` section
- Uncomment the `location /api/terminal` block
- Add `terminal` back to the regex patterns for metrics and health checks
- Update nginx `depends_on` to include `terminal`

#### 3. Update Prometheus Configuration

Uncomment the terminal job in `infra/prometheus/prometheus.yml`:

```yaml
- job_name: 'terminal'
  metrics_path: '/metrics'
  static_configs:
    - targets: ['terminal:3009']
      labels:
        service: 'terminal'
        type: 'microservice'
```

#### 4. Update Database Init Script

Uncomment `heidi_terminal` in `infra/postgres/init-databases.sh`:

```bash
# "heidi_terminal"
```

#### 5. Update Scripts

Uncomment terminal in migration scripts:

- `scripts/prisma-generate-all.sh`
- `scripts/prisma-migrate-all.sh`
- `scripts/prisma-migrate-prod.sh`
- `scripts/init-production.sh`

In each file, uncomment:
```bash
FUTURE_SERVICES=("terminal")
# SERVICES=("${ACTIVE_SERVICES[@]}" "${FUTURE_SERVICES[@]}")
```

#### 6. Run Migrations

```bash
# Generate Prisma client
yarn prisma:generate

# Run migrations
yarn prisma:migrate
```

#### 7. Development

Use the dedicated script or include manually:

```bash
# Start all services including terminal
yarn dev:all-with-terminal

# Or start terminal separately
yarn dev:terminal
```

### Features

- CRUD operations for city terminals
- Location tracking (JSON with latitude, longitude, address)
- Status management (Active, Inactive, Maintenance, Offline)
- City association (cityId)
- Soft delete support
- JWT authentication
- Health checks and metrics

### Related Documentation

- [Prisma Services Guide](./PRISMA_SERVICES.md)
- [Getting Started](./GETTING_STARTED.md)

---

**Last Updated:** 2025-01-02
