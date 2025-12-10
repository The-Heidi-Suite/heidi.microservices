# HEIDI — Backend Requirements & Implementation Plan (Backend-first)

**Purpose**
This document defines the concrete backend requirements, responsibilities, service catalogue, tenancy model, feature surface, and high-level infrastructure plan for the Heidi App Factory. Use this as the authoritative reference for scoping, implementation, and client sign-off.

> Diagram: refer to attached architecture image (provided) for logical layout and service placement.

---

## 1. Core Backend Responsibilities (what backend must deliver)

The backend implements the following platform capabilities (core responsibilities):

1. **Template & Feature Registry**
   - Store template metadata and versions (Template A / Template B).
   - Store feature module metadata, dependencies, and compatibility matrix.
   - Provide APIs for CMS to list, validate and select templates & features.

2. **App Configuration & Project Orchestration**
   - Persist app configuration (app name, bundle id, assets, theme, selected features).
   - Orchestrate project generation jobs (create reproducible workspace, merge template + features, inject config).
   - Provide build status tracking and artifact management.

3. **Core Business Logic & Listings**
   - Implement the primary domain logic for cities → categories → sub-categories → listings.
   - Provide CRUD + approval workflows for listings, categories, and hierarchical taxonomy.
   - Expose search and filtering APIs used by mobile and web frontends.

4. **Authentication & RBAC**
   - JWT-based authentication, refresh tokens, tenant-aware sessions.
   - Role-based access control covering: Super Admin, Super City Admin, City Admin, Citizen.
   - Enforce tenant isolation in API layer and data layer.

5. **Tenant Management**
   - Tenant lifecycle: onboarding, activation/deactivation, configuration, and metadata.
   - Manage tenant-scoped resources (registered apps, credentials, quotas).

6. **Notification & Scheduler**
   - Multi-channel notifications (push & email).
   - Scheduler for jobs, recurring tasks, and background processing.

7. **Integration & External Connectors**
   - Integration service to connect with DeepL, Payment providers, Destination.One, and other third parties.
   - Standardized connectors and retry / reconciliation logic.

8. **Analytics, Monitoring & Audit**
   - Capture usage metrics, dashboards, and admin insights.
   - System-wide audit trail capturing configuration changes, generation events, role changes and administrative actions.

9. **App Factory Supporting Services**
   - Artifact storage (signed APK/AAB/IPA), build metadata, signing coordination (keystores stored securely).
   - Worker orchestration (queueing, worker pods) for generation jobs and heavy background tasks (embeddings, indexing).

10. **Chatbot (Feature Add-on)**
    - Embedding pipeline, vector index management (per-tenant namespace), retrieval layer and query API.
    - Ingestion endpoints for document scraping and chunking; RAG integration for tenant-specific knowledge bases.

---

## 2. Feature Model & Responsibilities (core domain)

The platform must model and expose the following core content hierarchy and business rules:

- **City (tenant)**
  - Top-level tenant container. Each city is a tenant and owns its data, templates selection, feature toggles and app builds.

- **Category (level 1)**
  - City-managed categories for content grouping (e.g., Services, Businesses, Events).

- **Sub-category (level 2)**
  - Child categories to refine classification (e.g., Service → Waste Collection).

- **Listings (core feature)**
  - Items under sub-categories representing services, businesses, or points-of-interest.
  - Listing attributes: title, description, contact, location, opening hours, tags, media, category, approval status.
  - Workflows:
    - Admin/City Admin approvals and moderation
    - Public listing visibility states
    - Versioning (audit trail) on edits and approvals

**Placement:** The Listings capability will reside in the **Core Service** (core microservice) to ensure consistent functionality across the platform and reduce duplication.

---

## 3. Tenant Isolation Strategy

Design goals:

- Data isolation, per-tenant scoping, and GDPR compliance.
- Strong separation for tenant-scoped data, with flexibility for both shared and isolated models.

Approach (recommended):

1. **Per-Service Databases (Primary)**
   - Each microservice uses its own PostgreSQL logical database instance (or schema) to limit blast radius and enable independent scaling.
   - Tenant data is scoped via `tenant_id` column inside service DB. For stronger isolation, services may use tenant-specific schemas or database instances if required per client SLA.

2. **Namespaces for Vector/Index Storage**
   - Vector DB (Pinecone or equivalent) must use tenant-specific namespaces to avoid cross-tenant leakage.

3. **RBAC & Gateway Enforcement**
   - Tenant identification at API Gateway (header / token claim) and cookie/sessions; all services must use tenant context to enforce tenant-scoped access.

4. **Secrets per Tenant**
   - Keystores, provisioning profiles and other sensitive tenant credentials stored in Vault/KMS under tenant-specific paths and access policies.

---

## 4. Microservices Catalog (NestJS monorepo)

All services will be implemented in a NestJS monorepo. Each service has a separate Postgres database (or schema) and uses shared libs for common concerns.

### Microservices (current + new)

| Service                  | Port | Database             | Description                                                                   |
| ------------------------ | ---- | -------------------- | ----------------------------------------------------------------------------- |
| **Auth Service**         | 3001 | `heidi_auth`         | Authentication, JWT, sessions, RBAC                                           |
| **Users Service**        | 3002 | `heidi_users`        | Profiles, permissions, user management, terms acceptance                      |
| **City Service**         | 3003 | `heidi_city`         | City metadata, boundaries, tenant config                                      |
| **Core Service**         | 3004 | `heidi_core`         | Business orchestration, Listings, Categories, Tags, Tiles, approval workflows |
| **Notification Service** | 3005 | `heidi_notification` | Push (FCM/APNS), email delivery, templates, verification                      |
| **Scheduler Service**    | 3006 | `heidi_scheduler`    | Cron jobs, queue scheduling, retries, translation tasks                       |
| **Integration Service**  | 3007 | `heidi_integration`  | External API adapters (DeepL, Destination.One, Mobilithek)                    |
| **Admin Service**        | 3008 | `heidi_admin`        | Business metrics, admin dashboards, KPIs                                      |
| **Terminal Service**     | 3009 | `heidi_terminal`     | Kiosk/device registration & management (future)                               |

### Future Services (planned)

- **Project Generation Service** — App Factory orchestration, build job metadata, artifacts registry
- **Template Service** — Template versions, template metadata, compatibility checks
- **Feature Service** — Feature versions, dependencies, toggles, compatibility matrix
- **Theme Service** — Theme configs, fonts, colors, asset references
- **Audit Service / Logging Service** — Centralized audit trail, search, retention policies
- **Chatbot Service** — RAG orchestration, ingestion endpoints, embedding workers
- **Payment Service** — Payment orchestration, SEPA/GDPR-compliant flows

**Monorepo note:** Shared libraries for logging, db access (Prisma), tenant context, RBAC guards, message queue clients (RabbitMQ), S3 wrapper, and common DTOs.

---

## 5. Technology Stack & Libraries

### Runtime Environment

| Component      | Version  | Purpose              |
| -------------- | -------- | -------------------- |
| **Node.js**    | ≥24.11.0 | JavaScript runtime   |
| **npm**        | ≥10.0.0  | Package manager      |
| **TypeScript** | ^5.9.3   | Type-safe JavaScript |

### Core Framework

| Library                      | Version | Purpose                  |
| ---------------------------- | ------- | ------------------------ |
| **@nestjs/core**             | ^11.1.8 | NestJS core framework    |
| **@nestjs/common**           | ^11.1.8 | Common NestJS utilities  |
| **@nestjs/platform-express** | ^11.1.8 | Express HTTP adapter     |
| **@nestjs/config**           | ^4.0.2  | Configuration management |
| **@nestjs/microservices**    | ^11.1.8 | Microservices support    |
| **@nestjs/swagger**          | 11.0.7  | OpenAPI documentation    |

### Database & ORM

| Library            | Version | Purpose                       |
| ------------------ | ------- | ----------------------------- |
| **@prisma/client** | ^6.19.0 | Type-safe database client     |
| **prisma**         | ^6.19.0 | Database toolkit & migrations |

### Authentication & Security

| Library               | Version | Purpose                   |
| --------------------- | ------- | ------------------------- |
| **@nestjs/jwt**       | ^11.0.1 | JWT token management      |
| **@nestjs/passport**  | ^11.0.5 | Authentication middleware |
| **passport**          | ^0.7.0  | Authentication framework  |
| **passport-jwt**      | ^4.0.1  | JWT strategy for Passport |
| **bcrypt**            | ^6.0.0  | Password hashing          |
| **helmet**            | ^8.1.0  | Security headers          |
| **@nestjs/throttler** | ^6.4.0  | Rate limiting             |

### Messaging & Caching

| Library                     | Version | Purpose                        |
| --------------------------- | ------- | ------------------------------ |
| **amqp-connection-manager** | ^5.0.0  | RabbitMQ connection management |
| **amqplib**                 | ^0.10.9 | AMQP protocol client           |
| **ioredis**                 | ^5.8.2  | Redis client                   |

### External Services & Storage

| Library                           | Version  | Purpose                         |
| --------------------------------- | -------- | ------------------------------- |
| **@aws-sdk/client-s3**            | ^3.925.0 | S3-compatible object storage    |
| **@aws-sdk/s3-request-presigner** | ^3.925.0 | Presigned URL generation        |
| **firebase-admin**                | ^12.0.0  | Firebase/FCM push notifications |
| **nodemailer**                    | ^7.0.10  | Email delivery                  |
| **axios**                         | ^1.13.2  | HTTP client                     |
| **@nestjs/axios**                 | ^4.0.1   | NestJS HTTP module              |

### Monitoring & Logging

| Library                       | Version | Purpose                    |
| ----------------------------- | ------- | -------------------------- |
| **prom-client**               | ^15.1.3 | Prometheus metrics         |
| **winston**                   | ^3.18.3 | Logging framework          |
| **winston-daily-rotate-file** | ^5.0.0  | Log rotation               |
| **nest-winston**              | ^1.10.2 | NestJS Winston integration |
| **@nestjs/terminus**          | ^11.0.0 | Health checks              |

### Utilities

| Library               | Version | Purpose                 |
| --------------------- | ------- | ----------------------- |
| **class-validator**   | ^0.14.2 | DTO validation          |
| **class-transformer** | ^0.5.1  | Object transformation   |
| **handlebars**        | ^4.7.8  | Email templating        |
| **sharp**             | ^0.33.5 | Image processing        |
| **multer**            | ^2.0.2  | File upload handling    |
| **cron-parser**       | ^5.4.0  | Cron expression parsing |
| **rxjs**              | ^7.8.2  | Reactive programming    |
| **@nestjs/schedule**  | ^6.0.1  | Task scheduling         |

### Development Tools

| Library              | Version  | Purpose                   |
| -------------------- | -------- | ------------------------- |
| **@nestjs/cli**      | ^11.0.10 | NestJS CLI                |
| **@nestjs/testing**  | ^11.1.8  | Testing utilities         |
| **jest**             | ^29.7.0  | Testing framework         |
| **ts-jest**          | ^29.1.1  | TypeScript Jest preset    |
| **supertest**        | ^6.3.3   | HTTP testing              |
| **eslint**           | ^8.56.0  | Code linting              |
| **prettier**         | ^3.6.2   | Code formatting           |
| **commitizen**       | ^4.3.1   | Conventional commits      |
| **standard-version** | ^9.5.0   | Semantic versioning       |
| **concurrently**     | ^9.2.1   | Parallel script execution |
| **webpack**          | ^5.102.1 | Module bundler            |

---

## 6. Shared Libraries Architecture

The monorepo uses shared libraries under `libs/` with `@heidi/*` path aliases:

| Library          | Path Alias            | Purpose                                          |
| ---------------- | --------------------- | ------------------------------------------------ |
| **config**       | `@heidi/config`       | Configuration module, Swagger helpers            |
| **contracts**    | `@heidi/contracts`    | Shared DTOs, interfaces, event contracts         |
| **errors**       | `@heidi/errors`       | Custom error classes, error handling             |
| **health**       | `@heidi/health`       | Health check indicators                          |
| **i18n**         | `@heidi/i18n`         | Internationalization (10 languages)              |
| **interceptors** | `@heidi/interceptors` | Response transform, logging, timeout, validation |
| **jwt**          | `@heidi/jwt`          | JWT module, guards, strategies                   |
| **logger**       | `@heidi/logger`       | Winston logger configuration                     |
| **metrics**      | `@heidi/metrics`      | Prometheus metrics collection                    |
| **monitoring**   | `@heidi/monitoring`   | Monitoring integration                           |
| **prisma**       | `@heidi/prisma`       | Per-service Prisma modules & clients             |
| **rabbitmq**     | `@heidi/rabbitmq`     | RabbitMQ module, producers, consumers            |
| **rbac**         | `@heidi/rbac`         | Role-based access control guards & decorators    |
| **redis**        | `@heidi/redis`        | Redis module & service                           |
| **saga**         | `@heidi/saga`         | Distributed transaction patterns                 |
| **storage**      | `@heidi/storage`      | S3 storage abstraction                           |
| **tenancy**      | `@heidi/tenancy`      | Multi-tenant context, guards, interceptors       |
| **translations** | `@heidi/translations` | DeepL integration, translation providers         |

### Supported Languages (i18n)

- German (de) — Primary
- English (en)
- Arabic (ar)
- Danish (dk)
- Farsi/Persian (fa)
- Norwegian (no)
- Russian (ru)
- Swedish (se)
- Turkish (tr)
- Ukrainian (uk)

---

## 7. Docker & Container Architecture

### Base Image Strategy

Multi-stage Dockerfile optimized for production:

```dockerfile
# Stage 1: Base - Node.js 24.11.0 Alpine with essential deps
FROM node:24.11.0-alpine AS base
# OpenSSL, libc6-compat for Prisma, dumb-init for signal handling

# Stage 2: Dependencies - Production deps only
FROM base AS deps
RUN npm ci --omit=dev --legacy-peer-deps

# Stage 3: Build - Full build with dev deps
FROM base AS build
RUN npm ci --legacy-peer-deps
# Generate all Prisma clients
# Build specific app: npm run build:${APP_NAME}

# Stage 4: Production - Minimal runtime
FROM base AS production
# Copy only production deps, built app, Prisma clients, i18n translations
USER nestjs  # Non-root user
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
```

### Container Security

- **Non-root user**: `nestjs` user (UID 1001)
- **Minimal attack surface**: Alpine-based images
- **Signal handling**: `dumb-init` for proper PID 1 behavior
- **Health checks**: Built-in HTTP health check on `/healthz`

### Docker Compose Services

#### Infrastructure Services

| Service      | Image                            | Port               | Purpose                     |
| ------------ | -------------------------------- | ------------------ | --------------------------- |
| **postgres** | postgres:16-alpine               | 5432               | Primary database            |
| **redis**    | redis:7.4-alpine                 | 6379 (internal)    | Caching & sessions          |
| **rabbitmq** | rabbitmq:4.1.5-management-alpine | 5672, 15672, 15692 | Message queue               |
| **caddy**    | caddy:2.7-alpine                 | 80, 443            | Reverse proxy with auto-SSL |

#### Monitoring Stack (optional profile)

| Service               | Image                                 | Port | Purpose                    |
| --------------------- | ------------------------------------- | ---- | -------------------------- |
| **prometheus**        | prom/prometheus:latest                | 9090 | Metrics collection         |
| **grafana**           | grafana/grafana:latest                | 3000 | Dashboards & visualization |
| **alertmanager**      | prom/alertmanager:latest              | 9093 | Alert routing              |
| **postgres-exporter** | prometheuscommunity/postgres-exporter | 9187 | PostgreSQL metrics         |
| **redis-exporter**    | oliver006/redis_exporter              | 9121 | Redis metrics              |
| **node-exporter**     | prom/node-exporter                    | 9100 | Host system metrics        |

#### Admin Tools

| Service             | Image                          | Port | Purpose          |
| ------------------- | ------------------------------ | ---- | ---------------- |
| **pgadmin**         | dpage/pgadmin4:latest          | 5050 | PostgreSQL admin |
| **redis-commander** | rediscommander/redis-commander | 8081 | Redis admin      |

### Network Architecture

```yaml
networks:
  backend:
    driver: bridge
    ipam:
      config:
        - subnet: 172.28.0.0/16
```

- All services on isolated `backend` network
- Only Caddy/Nginx exposed to public (ports 80/443)
- Admin tools bound to `127.0.0.1` only
- Internal services communicate via Docker DNS

### Data Persistence

```
./data/
├── postgres/          # PostgreSQL data
├── redis/             # Redis AOF persistence
├── rabbitmq/          # RabbitMQ data
├── caddy/             # SSL certificates
├── caddy-config/      # Caddy configuration
├── prometheus/        # Metrics storage (30 day retention)
├── grafana/           # Dashboards & settings
└── alertmanager/      # Alert state
```

---

## 8. Kubernetes (K8s) Deployment Strategy

### Cluster Architecture (Hetzner Cloud)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Hetzner Cloud Kubernetes                      │
├─────────────────────────────────────────────────────────────────┤
│  Namespace: heidi-dev    │  Namespace: heidi-stage   │ heidi-prod│
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Ingress    │  │   Ingress    │  │   Ingress    │          │
│  │   (Traefik)  │  │   (Traefik)  │  │   (Traefik)  │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                  │
│  ┌──────┴───────────────────────────────────┴───────┐          │
│  │              Service Mesh / Load Balancer         │          │
│  └──────────────────────┬───────────────────────────┘          │
│                         │                                        │
│  ┌─────────┬─────────┬──┴──────┬─────────┬─────────┐          │
│  │  Auth   │  Users  │  City   │  Core   │ Notif.  │          │
│  │ (3001)  │ (3002)  │ (3003)  │ (3004)  │ (3005)  │          │
│  └────┬────┴────┬────┴────┬────┴────┬────┴────┬────┘          │
│       │         │         │         │         │                  │
│  ┌────┴─────────┴─────────┴─────────┴─────────┴────┐          │
│  │              Shared Infrastructure               │          │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐        │          │
│  │  │PostgreSQL│ │  Redis   │ │ RabbitMQ │        │          │
│  │  │ (HA/PVC) │ │ (Cluster)│ │(Clustered│        │          │
│  │  └──────────┘ └──────────┘ └──────────┘        │          │
│  └─────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### Namespace Strategy

| Namespace          | Purpose                           | Resource Quotas          |
| ------------------ | --------------------------------- | ------------------------ |
| `heidi-dev`        | Development environment           | Low limits               |
| `heidi-staging`    | Pre-production testing            | Medium limits            |
| `heidi-prod`       | Production workloads              | High limits, autoscaling |
| `heidi-monitoring` | Prometheus, Grafana, Alertmanager | Dedicated resources      |
| `heidi-infra`      | PostgreSQL, Redis, RabbitMQ       | Persistent storage       |

### Kubernetes Resources (per microservice)

```yaml
# Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: heidi-auth
  namespace: heidi-prod
spec:
  replicas: 2 # Minimum for HA
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    spec:
      containers:
        - name: auth
          image: registry.heidi.com/heidi-auth:v1.24.0
          resources:
            requests:
              memory: '256Mi'
              cpu: '100m'
            limits:
              memory: '512Mi'
              cpu: '500m'
          livenessProbe:
            httpGet:
              path: /healthz
              port: 3001
            initialDelaySeconds: 40
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /healthz
              port: 3001
            initialDelaySeconds: 10
            periodSeconds: 10
          env:
            - name: NODE_ENV
              value: 'production'
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: heidi-secrets
                  key: auth-database-url
```

### Horizontal Pod Autoscaler (HPA)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: heidi-core-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: heidi-core
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

### Ingress Configuration

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: heidi-api-ingress
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    traefik.ingress.kubernetes.io/router.middlewares: heidi-prod-rate-limit@kubernetescrd
spec:
  tls:
    - hosts:
        - api.heidi-app.de
      secretName: heidi-tls
  rules:
    - host: api.heidi-app.de
      http:
        paths:
          - path: /api/auth
            pathType: Prefix
            backend:
              service:
                name: heidi-auth
                port:
                  number: 3001
          # ... other services
```

### ConfigMaps & Secrets

```yaml
# ConfigMap for non-sensitive config
apiVersion: v1
kind: ConfigMap
metadata:
  name: heidi-config
data:
  NODE_ENV: 'production'
  LOG_LEVEL: 'info'
  RABBITMQ_VHOST: '/'

---
# External Secrets (from Vault/KMS)
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: heidi-secrets
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: heidi-secrets
  data:
    - secretKey: jwt-secret
      remoteRef:
        key: heidi/prod/jwt
        property: secret
```

### Persistent Volume Claims

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
  namespace: heidi-infra
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: hcloud-volumes
  resources:
    requests:
      storage: 100Gi
```

---

## 9. Monitoring & Observability Stack

### Metrics Collection (Prometheus)

**Scrape Targets:**

| Job            | Target                    | Metrics                        |
| -------------- | ------------------------- | ------------------------------ |
| `auth`         | auth:3001/metrics         | HTTP requests, latency, errors |
| `users`        | users:3002/metrics        | User operations, sessions      |
| `city`         | city:3003/metrics         | City queries, cache hits       |
| `core`         | core:3004/metrics         | Listings, categories, search   |
| `notification` | notification:3005/metrics | Push/email delivery            |
| `scheduler`    | scheduler:3006/metrics    | Job execution, queue depth     |
| `integration`  | integration:3007/metrics  | External API calls             |
| `admin`        | admin:3008/metrics        | Admin operations               |
| `postgres`     | postgres-exporter:9187    | DB connections, queries        |
| `redis`        | redis-exporter:9121       | Memory, commands, keys         |
| `rabbitmq`     | rabbitmq:15692            | Queue depth, messages          |
| `node`         | node-exporter:9100        | CPU, memory, disk, network     |

### Alert Rules

```yaml
groups:
  - name: heidi_microservices
    rules:
      # Service availability
      - alert: ServiceDown
        expr: up{type="microservice"} == 0
        for: 1m
        labels:
          severity: critical

      # High error rate
      - alert: HighErrorRate
        expr: rate(heidi_http_request_errors_total[5m]) > 0.1
        for: 5m
        labels:
          severity: warning

      # High latency (95th percentile > 1s)
      - alert: HighRequestLatency
        expr: histogram_quantile(0.95, rate(heidi_http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning

      # Memory pressure
      - alert: HighMemoryUsage
        expr: (nodejs_heap_size_total_bytes / nodejs_heap_size_limit_bytes) > 0.9
        for: 5m
        labels:
          severity: warning

      # Database/Redis/RabbitMQ connectivity
      - alert: DatabaseConnectionFailure
        expr: up{type="database"} == 0
        for: 1m
        labels:
          severity: critical
```

### Grafana Dashboards

Pre-configured dashboards in `infra/grafana/provisioning/dashboards/`:

1. **Infrastructure Dashboard** (`infrastructure.json`)
   - PostgreSQL connections, query rates, replication lag
   - Redis memory usage, hit rates, commands/sec
   - RabbitMQ queue depths, message rates
   - Host CPU, memory, disk, network

2. **Microservices Dashboard** (`microservices.json`)
   - Request rates per service
   - Response time histograms
   - Error rates and types
   - Active connections
   - Node.js heap usage

### Alertmanager Routing

```yaml
route:
  receiver: 'default'
  group_by: ['alertname', 'cluster', 'service']
  routes:
    - match:
        severity: critical
      receiver: 'oncall'
    - match:
        severity: warning
      receiver: 'team'
    - match:
        type: database
      receiver: 'database-team'
```

---

## 10. CI/CD Pipeline

### Pipeline Stages

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  Lint   │───▶│  Test   │───▶│  Build  │───▶│  Push   │───▶│ Deploy  │
│  Check  │    │  Unit   │    │ Docker  │    │Registry │    │  K8s    │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
```

### Build Scripts

| Script               | Command                   | Purpose                    |
| -------------------- | ------------------------- | -------------------------- |
| `build:auth`         | `nest build auth`         | Build Auth service         |
| `build:users`        | `nest build users`        | Build Users service        |
| `build:city`         | `nest build city`         | Build City service         |
| `build:core`         | `nest build core`         | Build Core service         |
| `build:notification` | `nest build notification` | Build Notification service |
| `build:scheduler`    | `nest build scheduler`    | Build Scheduler service    |
| `build:integration`  | `nest build integration`  | Build Integration service  |
| `build:admin`        | `nest build admin`        | Build Admin service        |

### Docker Build Commands

```bash
# Build all services
npm run docker:build

# Build with monitoring profile
npm run docker:build:monitoring

# Sequential builds (for memory-constrained environments)
npm run docker:build:sequential

# Build without cache
npm run docker:build:no-cache
```

### Database Migrations

```bash
# Generate Prisma clients for all services
npm run prisma:generate

# Run all migrations (development)
npm run prisma:migrate

# Run migrations (production - deploy only)
npm run prisma:migrate:prod
```

### Seeding Scripts

```bash
# Run all seeds
npm run seed:all

# Individual seeds
npm run seed:terms           # Terms & conditions
npm run seed:salutations     # Salutation options
npm run seed:categories      # Default categories
npm run seed:permissions     # RBAC permissions
npm run seed:tiles           # Dashboard tiles
npm run seed:initial-admin   # Super admin user
npm run seed:firebase-project # FCM configuration
npm run seed:schedules       # Scheduled tasks
```

### Release Management

```bash
# Create release with conventional commits
npm run release

# Dry run release
npm run release:dry

# Conventional commit helper
npm run commit
```

---

## 11. Feature Modules (Add-on, city opt-in)

As per the proposal, cities can opt-in to feature modules. Backend must provide support for each feature as separate packages/services or clear integration contracts:

Feature list (to be offered as opt-in modules):

- User Onboarding
- POI Map
- Theme Design
- Admin Management
- Search Function
- Multilingualism
- Multiple Location Selection
- Channel Function
- Job Matching (Wunsiedel)
- Interface to SpotAR (Gera)
- Pre-Planning Function
- Simplycard Integration
- Waste Collection Calendar
- Live Chat
- Advertisement Feature
- Mobile Dashboard
- Defect Reporter
- Survey Tool
- Business Community
- Chatbot (RAG-based)
- Any future feature module will be registered in Feature Service with declared dependencies and compatible template versions.

**Backend role:** Provide feature metadata, lifecycle, enable/disable APIs, per-tenant toggles, and feature-level permissions.

---

## 12. High-level Infrastructure Plan (future-ready)

This is the high-level infra blueprint required to host and operate the backend:

### Cloud / Hosting

| Component          | Provider        | Purpose                         |
| ------------------ | --------------- | ------------------------------- |
| **Kubernetes**     | Hetzner Cloud   | Container orchestration         |
| **Load Balancer**  | Hetzner LB      | Traffic distribution            |
| **Block Storage**  | Hetzner Volumes | Persistent storage              |
| **Object Storage** | Hetzner S3      | Assets & artifacts              |
| **DNS**            | Cloudflare      | DNS management, DDoS protection |

### Databases

| Service        | Technology           | Configuration                                |
| -------------- | -------------------- | -------------------------------------------- |
| **PostgreSQL** | PostgreSQL 16 Alpine | Per-service databases with automated backups |
| **Redis**      | Redis 7.4 Alpine     | Clustering for HA, AOF persistence           |
| **RabbitMQ**   | RabbitMQ 4.1.5       | Clustered with management plugin             |

### Storage Buckets

| Bucket            | Purpose                   | Access         |
| ----------------- | ------------------------- | -------------- |
| `heidi-assets`    | User uploads, images      | Presigned URLs |
| `heidi-artifacts` | Build artifacts (APK/IPA) | Private        |
| `heidi-backups`   | Database backups          | Private        |

### Queueing (RabbitMQ)

| Exchange              | Type   | Queues                        |
| --------------------- | ------ | ----------------------------- |
| `heidi.events`        | Topic  | Service-specific event queues |
| `heidi.notifications` | Direct | Push, email delivery queues   |
| `heidi.scheduler`     | Direct | Task execution queues         |

### Caching Strategy (Redis)

| Use Case          | TTL | Key Pattern                 |
| ----------------- | --- | --------------------------- |
| Session cache     | 24h | `session:{userId}`          |
| Rate limiting     | 1m  | `ratelimit:{ip}:{endpoint}` |
| City config       | 1h  | `city:{cityId}:config`      |
| Translation cache | 24h | `translation:{lang}:{key}`  |

### Vector DB (Future)

- Pinecone (or equivalent) for embeddings — tenant namespace strategy
- Per-tenant namespace isolation
- Index lifecycle management

### Secrets Management

- HashiCorp Vault (or Kubernetes Secrets with External Secrets Operator)
- Per-tenant keystores and provisioning profiles
- Automatic rotation policies

### CI/CD

| Stage          | Tool              | Purpose                      |
| -------------- | ----------------- | ---------------------------- |
| **Source**     | GitHub/GitLab     | Code repository              |
| **Build**      | GitHub Actions    | Docker image builds          |
| **Registry**   | Harbor/GHCR       | Container registry           |
| **Deploy**     | ArgoCD/Flux       | GitOps deployment            |
| **iOS Builds** | Bitrise/Codemagic | macOS builds for App Factory |

### Monitoring & Observability

| Tool             | Purpose            | Retention |
| ---------------- | ------------------ | --------- |
| **Prometheus**   | Metrics collection | 30 days   |
| **Grafana**      | Visualization      | —         |
| **Alertmanager** | Alert routing      | —         |
| **Loki**         | Log aggregation    | 14 days   |
| **Sentry**       | Error tracking     | 90 days   |

---

## 13. Third-Party Services – High-Level Plan

Plan the integration tiers and responsibilities:

| Service               | Provider                 | Purpose                     | Integration          |
| --------------------- | ------------------------ | --------------------------- | -------------------- |
| **Embeddings & LLMs** | OpenAI/Azure             | Text embeddings for chatbot | Integration Service  |
| **Vector DB**         | Pinecone                 | Semantic search storage     | Chatbot Service      |
| **Translation**       | DeepL API                | Multi-language support      | Translation lib      |
| **Push (Android)**    | Firebase Cloud Messaging | Android notifications       | Notification Service |
| **Push (iOS)**        | Apple Push Notification  | iOS notifications           | Notification Service |
| **Email**             | SMTP (Sendgrid/Postmark) | Transactional emails        | Notification Service |
| **Payment**           | SEPA-compliant provider  | Payment processing          | Payment Service      |
| **Events**            | Destination.One          | Event data import           | Integration Service  |
| **Parking**           | Mobilithek               | Parking data                | Integration Service  |
| **iOS Builds**        | Bitrise/Codemagic        | macOS CI for App Factory    | External             |

---

## 14. Security & Compliance (EU-only)

All design and implementation will respect EU/German data protection standards:

### Data Residency

- All persistent data and backups must be stored in EU data centers (Hetzner Germany)
- No data transfer to non-EU regions without explicit consent

### GDPR Compliance

| Requirement            | Implementation                  |
| ---------------------- | ------------------------------- |
| **Right to erasure**   | User deletion API with cascade  |
| **Right to export**    | Data export endpoint (JSON/CSV) |
| **Consent management** | Terms acceptance tracking       |
| **Data minimization**  | Only essential data collected   |
| **Privacy by design**  | Tenant isolation, encryption    |

### Security Controls

| Control              | Implementation                         |
| -------------------- | -------------------------------------- |
| **Authentication**   | JWT with RS256, refresh token rotation |
| **Authorization**    | RBAC with permission matrix            |
| **Rate limiting**    | Per-IP and per-user throttling         |
| **Input validation** | class-validator on all DTOs            |
| **SQL injection**    | Prisma parameterized queries           |
| **XSS prevention**   | Helmet security headers                |
| **HTTPS**            | TLS 1.3 via Caddy/Let's Encrypt        |
| **Secrets**          | Vault/KMS, no plaintext in env         |

### Audit Trail

| Event Type     | Data Captured                          |
| -------------- | -------------------------------------- |
| Authentication | Login/logout, failed attempts          |
| Authorization  | Role changes, permission grants        |
| Data changes   | CRUD operations on sensitive entities  |
| Admin actions  | Configuration changes, user management |
| Build events   | App generation, artifact signing       |

---

## 15. Acceptance Criteria (backend)

To sign off on backend readiness, the following must be demonstrable:

- Template & Feature APIs exist and return expected metadata with versioning.
- Core Service implements cities → categories → sub-categories → listings with CRUD, approval flows and tenant isolation.
- Auth & RBAC enforced across endpoints for roles defined.
- Project Generation service can accept a build request and create a reproducible build workspace (no build required at this stage but orchestration flow validated).
- Audit Trail records configuration changes, admin actions, and build events with query endpoints.
- Chatbot feature supports ingestion, embedding upsert to per-tenant index and tenant-scoped query endpoint.
- Observability: Prometheus/Grafana dashboards for service health, job queue length and build durations.
- Secrets: Vault integration demonstrated for one tenant signing workflow.

---

## 16. Next Steps — Project Tracking & Deliverables

Use the following checklist to track implementation progress and client sign-off:

1. ✅ Confirm and freeze backend scope & non-functional targets (SLA, QPS).
2. ✅ Finalize microservice owners and repo links in NestJS monorepo.
3. ✅ Implement Template & Feature Service contracts (OpenAPI).
4. ✅ Implement Core Service Listings & approval flows.
5. ✅ Implement Auth & RBAC; enable tenant-aware middleware in API Gateway.
6. ⏳ Implement Audit Service & integrate with all services.
7. ⏳ Implement Project Generation orchestration skeleton and worker contract.
8. ⏳ Implement Chatbot ingestion pipeline and per-tenant index test (staging).
9. ✅ Provision infra: Postgres instances, object storage buckets, RabbitMQ, Redis, Vault.
10. ✅ Implement CI/CD skeleton for backend (build/test/deploy).
11. ⏳ Create operational runbooks for backups, secret rotations, and emergency rebuilds.

---

## Appendix A — Artifacts to attach

- Architecture screenshot (attached) — use as canonical logical diagram.
- List of feature modules (proposal).
- Role matrix (Super Admin, Super City Admin, City Admin, Citizen).
- Example build/job payload (for Orchestrator API).

---

## Appendix B — API Documentation

All services expose Swagger/OpenAPI documentation:

| Service      | Swagger URL                              |
| ------------ | ---------------------------------------- |
| Auth         | `https://{domain}/api/auth/docs`         |
| Users        | `https://{domain}/api/users/docs`        |
| City         | `https://{domain}/api/city/docs`         |
| Core         | `https://{domain}/api/core/docs`         |
| Notification | `https://{domain}/api/notification/docs` |
| Scheduler    | `https://{domain}/api/scheduler/docs`    |
| Integration  | `https://{domain}/api/integration/docs`  |
| Admin        | `https://{domain}/api/admin/docs`        |

---

## Appendix C — Environment Variables

### Required Variables

```bash
# Database
POSTGRES_USER=heidi
POSTGRES_PASSWORD=<secure-password>
POSTGRES_DB=heidi_db

# JWT
JWT_SECRET=<256-bit-secret>
JWT_REFRESH_SECRET=<256-bit-secret>
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Redis
REDIS_PASSWORD=<secure-password>

# RabbitMQ
RABBITMQ_USER=heidi
RABBITMQ_PASSWORD=<secure-password>
RABBITMQ_VHOST=/

# S3 Storage
S3_ENDPOINT=https://s3.eu-central-1.amazonaws.com
S3_BUCKET=heidi-assets
S3_ACCESS_KEY=<access-key>
S3_SECRET_KEY=<secret-key>

# Firebase (Push Notifications)
FIREBASE_PROJECT_ID=<project-id>
FIREBASE_CLIENT_EMAIL=<service-account-email>
FIREBASE_PRIVATE_KEY=<private-key>

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=<username>
SMTP_PASSWORD=<password>
EMAIL_FROM=noreply@heidi-app.de

# External APIs
DEEPL_API_KEY=<api-key>
DESTINATION_ONE_API_KEY=<api-key>
```

---

## Appendix D — Quick Start Commands

```bash
# Install dependencies
npm run bootstrap

# Start infrastructure (dev)
npm run dev:docker

# Run all services (dev)
npm run dev:all

# Run specific service (dev)
npm run dev:auth
npm run dev:core

# Build for production
npm run docker:build

# Deploy to production
npm run docker:up

# View logs
npm run docker:logs

# Clean up
npm run docker:cleanup
```
