# HEIDI — Backend Requirements & Implementation Plan (Backend-first)

**Purpose**
This document defines the concrete backend requirements, responsibilities, service catalogue, tenancy model, feature surface, and high-level infrastructure plan for the Heidi App Factory. Use this as the authoritative reference for scoping, implementation, and client sign-off.

> Diagram: refer to attached architecture image (provided) for logical layout and service placement.

---

## 1. Core Backend Responsibilities (what backend must deliver)

The backend implements the following platform capabilities (core responsibilities):

1. **Template & Feature Registry**

   * Store template metadata and versions (Template A / Template B).
   * Store feature module metadata, dependencies, and compatibility matrix.
   * Provide APIs for CMS to list, validate and select templates & features.

2. **App Configuration & Project Orchestration**

   * Persist app configuration (app name, bundle id, assets, theme, selected features).
   * Orchestrate project generation jobs (create reproducible workspace, merge template + features, inject config).
   * Provide build status tracking and artifact management.

3. **Core Business Logic & Listings**

   * Implement the primary domain logic for cities → categories → sub-categories → listings.
   * Provide CRUD + approval workflows for listings, categories, and hierarchical taxonomy.
   * Expose search and filtering APIs used by mobile and web frontends.

4. **Authentication & RBAC**

   * JWT-based authentication, refresh tokens, tenant-aware sessions.
   * Role-based access control covering: Super Admin, Super City Admin, City Admin, Citizen.
   * Enforce tenant isolation in API layer and data layer.

5. **Tenant Management**

   * Tenant lifecycle: onboarding, activation/deactivation, configuration, and metadata.
   * Manage tenant-scoped resources (registered apps, credentials, quotas).

6. **Notification & Scheduler**

   * Multi-channel notifications (push & email).
   * Scheduler for jobs, recurring tasks, and background processing.

7. **Integration & External Connectors**

   * Integration service to connect with DeepL, Payment providers, Destination.One, and other third parties.
   * Standardized connectors and retry / reconciliation logic.

8. **Analytics, Monitoring & Audit**

   * Capture usage metrics, dashboards, and admin insights.
   * System-wide audit trail capturing configuration changes, generation events, role changes and administrative actions.

9. **App Factory Supporting Services**

   * Artifact storage (signed APK/AAB/IPA), build metadata, signing coordination (keystores stored securely).
   * Worker orchestration (queueing, worker pods) for generation jobs and heavy background tasks (embeddings, indexing).

10. **Chatbot (Feature Add-on)**

    * Embedding pipeline, vector index management (per-tenant namespace), retrieval layer and query API.
    * Ingestion endpoints for document scraping and chunking; RAG integration for tenant-specific knowledge bases.

---

## 2. Feature Model & Responsibilities (core domain)

The platform must model and expose the following core content hierarchy and business rules:

* **City (tenant)**

  * Top-level tenant container. Each city is a tenant and owns its data, templates selection, feature toggles and app builds.

* **Category (level 1)**

  * City-managed categories for content grouping (e.g., Services, Businesses, Events).

* **Sub-category (level 2)**

  * Child categories to refine classification (e.g., Service → Waste Collection).

* **Listings (core feature)**

  * Items under sub-categories representing services, businesses, or points-of-interest.
  * Listing attributes: title, description, contact, location, opening hours, tags, media, category, approval status.
  * Workflows:

    * Admin/City Admin approvals and moderation
    * Public listing visibility states
    * Versioning (audit trail) on edits and approvals

**Placement:** The Listings capability will reside in the **Core Service** (core microservice) to ensure consistent functionality across the platform and reduce duplication.

---

## 3. Tenant Isolation Strategy

Design goals:

* Data isolation, per-tenant scoping, and GDPR compliance.
* Strong separation for tenant-scoped data, with flexibility for both shared and isolated models.

Approach (recommended):

1. **Per-Service Databases (Primary)**

   * Each microservice uses its own PostgreSQL logical database instance (or schema) to limit blast radius and enable independent scaling.
   * Tenant data is scoped via `tenant_id` column inside service DB. For stronger isolation, services may use tenant-specific schemas or database instances if required per client SLA.

2. **Namespaces for Vector/Index Storage**

   * Vector DB (Pinecone or equivalent) must use tenant-specific namespaces to avoid cross-tenant leakage.

3. **RBAC & Gateway Enforcement**

   * Tenant identification at API Gateway (header / token claim) and cookie/sessions; all services must use tenant context to enforce tenant-scoped access.

4. **Secrets per Tenant**

   * Keystores, provisioning profiles and other sensitive tenant credentials stored in Vault/KMS under tenant-specific paths and access policies.

---

## 4. Microservices Catalog (NestJS monorepo)

All services will be implemented in a NestJS monorepo. Each service has a separate Postgres database (or schema) and uses shared libs for common concerns.

### Microservices (current + new)

* **Auth Service** — Authentication, JWT, sessions, RBAC.
* **Users Service** — Profiles, permissions, user management.
* **Core Service** — Business orchestration, Listings, Categories, approval workflows.
* **Terminal Service** — Kiosk/device registration & management.
* **Notification Service** — Push, email delivery, templates, delivery status.
* **Scheduler Service** — Cron jobs, queue scheduling, retries.
* **Integration Service** — External API adapters (DeepL, Payments, Destination.One).
* **City Management Service** — City metadata, boundaries, tenant config.
* **Analytics/Admin Service** — Business metrics, admin dashboards, KPIs.
* **Project Generation Service** — App Factory orchestration, build job metadata, artifacts registry.
* **Template Service** — Template versions, template metadata, compatibility checks.
* **Feature Service** — Feature versions, dependencies, toggles, compatibility matrix.
* **Theme Service** — Theme configs, fonts, colors, asset references.
* **Audit Service / Logging Service** — Centralized audit trail, search, retention policies.
* **Chatbot Service** — RAG orchestration, ingestion endpoints, embedding workers, point-in-time vector index operations.
* **Payment Service** (planned) — Payment orchestration, SEPA/GDPR-compliant flows.

**Monorepo note:** Shared libraries for logging, db access (Prisma), tenant context, RBAC guards, message queue clients (RabbitMQ), S3 wrapper, and common DTOs.

---

## 5. Feature Modules (Add-on, city opt-in)

As per the proposal, cities can opt-in to feature modules. Backend must provide support for each feature as separate packages/services or clear integration contracts:

Feature list (to be offered as opt-in modules):

* User Onboarding
* POI Map
* Theme Design
* Admin Management
* Search Function
* Multilingualism
* Multiple Location Selection
* Channel Function
* Job Matching (Wunsiedel)
* Interface to SpotAR (Gera)
* Pre-Planning Function
* Simplycard Integration
* Waste Collection Calendar
* Live Chat
* Advertisement Feature
* Mobile Dashboard
* Defect Reporter
* Survey Tool
* Business Community
* Chatbot (RAG-based)
* Any future feature module will be registered in Feature Service with declared dependencies and compatible template versions.

**Backend role:** Provide feature metadata, lifecycle, enable/disable APIs, per-tenant toggles, and feature-level permissions.

---

## 6. High-level Infrastructure Plan (future-ready)

This is the high-level infra blueprint required to host and operate the backend:

* **Cloud / Hosting**

  * Hetzner Cloud (Kubernetes) for container orchestration.
  * K8s namespaces per environment (dev/stage/prod) and possible per-tenant isolation for heavy tenants.

* **Databases**

  * PostgreSQL — per-service databases (with automated backups and WAL archiving).
  * Optionally use schema-per-tenant for high isolation customers.

* **Object Storage**

  * S3-compatible bucket (Hetzner Object Storage) for assets and build artifacts.

* **Queueing**

  * RabbitMQ for inter-service messaging, task orchestration and events.

* **Caching**

  * Redis for short-term caching, rate-limiting and session caches.

* **Vector DB**

  * Pinecone (or equivalent) for embeddings — tenant namespace strategy.

* **Secrets**

  * HashiCorp Vault (or cloud KMS) for keystores, provisioning profiles and API keys.

* **CI/CD**

  * Pipeline for backend: automated builds, image push, Helm charts and K8s deployments (see CI/CD task added earlier). Hosted macOS CI for iOS builds (Bitrise/Codemagic) for App Factory.

* **Monitoring & Observability**

  * Prometheus + Grafana, Loki for logs, self-hosted Sentry for error tracking.
  * Dashboards for build queues, job durations, vector DB health, and tenant-specific metrics.

---

## 7. Third-Party Services – High-Level Plan

Plan the integration tiers and responsibilities:

* **Embeddings & LLMs**

  * Choose stable embedding model (same as City 1) and pin model version.
  * Use a managed Vector DB (Pinecone) with tenant namespaces.

* **Translation**

  * DeepL API for translation/localisation.

* **Payment**

  * Payment provider (German/SEPA-compliant) integration via Integration Service when needed.

* **Push Notifications**

  * Firebase Cloud Messaging for Android, APNS for iOS (provision through tenant credentials).

* **Hosted iOS Builds**

  * Bitrise or Codemagic for macOS builds and Fastlane automation.

---

## 8. Security & Compliance (EU-only)

All design and implementation will respect EU/German data protection standards:

* Data residency: All persistent data and backups must be stored in EU data centers (Hetzner).
* GDPR: Provide data erasure and data export flows; maintain consent & privacy policies for store submissions.
* Audit Trail: Retain administrative changes and generation events for compliance; retention policy configurable per-tenant.
* Secrets: Keystores and signing materials stored and rotated in Vault; access governed by RBAC and least-privilege.
* Tenant isolation: Prevent cross-tenant data access using tenant-aware middleware in the gateway and service layers.

---

## 9. Acceptance Criteria (backend)

To sign off on backend readiness, the following must be demonstrable:

* Template & Feature APIs exist and return expected metadata with versioning.
* Core Service implements cities → categories → sub-categories → listings with CRUD, approval flows and tenant isolation.
* Auth & RBAC enforced across endpoints for roles defined.
* Project Generation service can accept a build request and create a reproducible build workspace (no build required at this stage but orchestration flow validated).
* Audit Trail records configuration changes, admin actions, and build events with query endpoints.
* Chatbot feature supports ingestion, embedding upsert to per-tenant index and tenant-scoped query endpoint.
* Observability: Prometheus/Grafana dashboards for service health, job queue length and build durations.
* Secrets: Vault integration demonstrated for one tenant signing workflow.

---

## 10. Next Steps — Project Tracking & Deliverables

Use the following checklist to track implementation progress and client sign-off:

1. Confirm and freeze backend scope & non-functional targets (SLA, QPS).
2. Finalize microservice owners and repo links in NestJS monorepo.
3. Implement Template & Feature Service contracts (OpenAPI).
4. Implement Core Service Listings & approval flows.
5. Implement Auth & RBAC; enable tenant-aware middleware in API Gateway.
6. Implement Audit Service & integrate with all services.
7. Implement Project Generation orchestration skeleton and worker contract.
8. Implement Chatbot ingestion pipeline and per-tenant index test (staging).
9. Provision infra: Postgres instances, object storage buckets, RabbitMQ, Redis, Vault.
10. Implement CI/CD skeleton for backend (build/test/deploy).
11. Create operational runbooks for backups, secret rotations, and emergency rebuilds.

---

## Appendix — Artifacts to attach

* Architecture screenshot (attached) — use as canonical logical diagram.
* List of feature modules (proposal).
* Role matrix (Super Admin, Super City Admin, City Admin, Citizen).
* Example build/job payload (for Orchestrator API).
