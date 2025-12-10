# **HEIDI — Web CMS & Citizen Web App

Requirements & Implementation Plan**

This document defines the **complete** (non-MVP) requirements for the **Web CMS (Admin Panel)** and **Citizen Web App**, aligned with the modular App Factory architecture, tenant system, backend microservices, and feature modules.

---

# **1. Purpose & Scope**

The system consists of two web applications:

### **A. HEIDI Web CMS** (Admin / City Management Platform)

Used by:

* Super Admin
* Super City Admin
* City Admin
* Editor / Contributor (Authenticated Citizen)

Functions:

* Manage city apps, content, listings, categories, feature modules, ads, chatbot, users, analytics.
* Configure templates, themes, branding.
* Manage app builds through App Factory.
* Moderate submissions from citizens/contributors.

### **B. HEIDI Citizen Web App** (Public Web Platform)

Used by:

* Public Visitors (Anonymous Citizens)
* Authenticated Citizens

Functions:

* Access listings, search, events, news, chatbot, ads, business community features, etc.
* Provide a web-accessible interface for the same features enabled in the mobile app.

This document ensures feature parity and correct integration between **Web CMS**, **Web App**, **Backend**, and **Mobile App**.

---

# **2. Actors & Roles (Updated & Approved)**

### **Super Admin**

Platform-level operator.
Controls:

* City activation/deactivation
* Global templates, features, permissions
* Platform-wide analytics
* Audit logs
* User & role provisioning

### **Super City Admin**

City-level operator.
Controls:

* Local CMS data
* City Admins
* Local notifications
* Local settings & configurations
* Template & feature selections for their city

### **City Admin**

Operational manager.
Controls:

* Listings approvals
* Content publishing (News, Events, Ads)
* Local dashboards
* Business Community moderation
* Managing local assets & categories

### **Editor / Contributor (Authenticated Citizen)**

* Can submit listings, reports, posts, and other city content.
* All submissions must be **approved by City Admin** before going live.

### **Anonymous Citizen**

* Public visitor with no login.
* Can browse listings, use chatbot, view news/events.
* Cannot contribute content.

---

# **3. High-Level Requirements (Full Scope)**

## **3.1 Web CMS (Admin Panel)**

### **A. App Builder**

* Template A/B selection
* Feature module selection per city
* Theme configuration (colors, fonts, icons)
* App metadata setup: app name, bundle ID, package name
* Branding configuration (logos, splash, app icons)

### **B. Dynamic Mobile App Preview**

Real-time preview of the mobile app UI inside CMS:

* Updates instantly when fields change
* Allows interactive navigation
* Shows approximate fonts/spacing (device-dependent variations allowed)
* Helps users understand layout, structure, navigation flow

### **C. Content Management**

Admin can manage:

* Listings
* Categories / Subcategories
* Events
* News
* Business Community content
* Ads & placement logic
* POIs

Includes:

* Rich text editing
* Media upload
* Versioning & change history
* Multilingual support (if enabled)

### **D. Approval Workflows**

For Editor/Contributor submissions:

* Queue view
* Approve / Reject / Request changes
* Audit log for each action

### **E. Feature Modules**

Each city can enable modules such as:

* Job Matching
* Business Community
* Advertisement System
* Survey Tool
* Waste Collection Calendar
* Live Chat
* Multilingualism
* SpotAR
* Simplycard
* Pre-Planning
* Chatbot (RAG-based)
* Defect Reporter
* Mobile Dashboard
* Channels
* And all modules listed in backend proposal

CMS must display:

* Description
* Dependencies
* Version compatibility
* Enable/Disable toggle

### **F. Notifications Console**

* Push & email notifications
* Templates
* Scheduling
* Delivery reports
* Multi-channel support

### **G. Build Management (App Factory Integration)**

* Trigger builds for Android/iOS
* View build status in real time
* Download artifacts
* View build history
* Restrict build actions by RBAC

### **H. User & Role Management**

* Add/edit/delete users
* Assign roles (Super Admin, Super City Admin, City Admin, Editor)
* Impersonation (Super Admin only)
* Manage permissions & feature visibility

### **I. Analytics Dashboard**

* Usage metrics
* Listings & content statistics
* Feature usage per tenant
* Notifications performance
* Chatbot stats

### **J. Audit Trail (Backend-driven)**

* View all configuration changes
* Track build triggers
* Track role & user updates
* Track content moderation
* Fully filterable by tenant/time/user

### **K. Chatbot Administration**

* Enable/disable chatbot module
* Trigger ingestion & re-index operations
* View embedding progress and ingestion logs
* Monitor chatbot accuracy metrics

### **L. Accessibility**

* WCAG 2.1 AA compliance
* Keyboard navigation
* Screen reader labels
* High contrast support

---

## **3.2 Citizen Web App (Public Web Platform)**

### **A. Homepage**

* Search bar
* Highlighted categories or city services
* Alerts/notifications banner
* Quick links

### **B. Listings**

* Category → sub-category navigation
* Listing list with infinite scroll
* Listing detail (media, contact, map, open hours, related services)
* Save to favorites (authenticated)

### **C. Events & News**

* Calendar list
* Event detail with RSVP or calendar export
* News articles with images, tags, categories

### **D. Search**

* Full-text global search
* Autocomplete
* Filters (category, location, distance, tags)

### **E. Chatbot Widget**

* Floating chatbot UI
* Tenant-specific RAG backend
* Works for anonymous & authenticated users
* Supports follow-up questions
* Can display citations

### **F. Business Community**

If enabled:

* Community feed
* Post creation (authenticated only)
* Post moderation rules
* Comments

### **G. Ads & Monetization**

* Display city-admin configured ads
* Support for page-level and inline placements

### **H. POI & Maps**

* Map-based service view
* POI markers
* Directions (external map app)
* Filter by category

### **I. Authentication**

* Login / Signup
* Profile
* Saved content
* Contribution history

### **J. Accessibility**

* Full WCAG 2.1 AA compliance
* High contrast
* Font scaling
* Semantic HTML
* Keyboard navigable

---

# **4. Integrations With Backend**

Both CMS and Web App integrate with:

### Backend Microservices

* Auth Service
* Users Service
* Core Service (Listings, Categories)
* Template & Feature Services
* AppConfig Service
* ProjectGen Service
* Notification Service
* Chatbot Service
* Analytics/Admin Service
* Audit/Logging Service
* City Management Service

### Infrastructure

* S3 Object Storage (media uploads)
* RabbitMQ events (for updates, notifications)
* Redis caching

All requests must include:

* **Tenant context**
* **Role-based access control checks**

---

# **5. Platform Architecture (Web Layer)**

### Web CMS

* React + TypeScript
* Tailwind + Heidi Design System
* Rendered as SPA (no SEO needs)
* Hosted behind API Gateway
* Strict RBAC for route access
* Secure interactions with object storage for uploads

### Citizen Web App

* Next.js
* SSR for:

  * Homepage
  * Category pages
  * Listing pages
  * Search results
* CSR for:

  * Chatbot
  * Profile
  * Favorites

### Shared Requirements

* Sentry integration
* Analytics events posting
* i18n library
* Global theme sync with backend

---

# **6. Security Requirements**

* JWT-based authentication
* HTTPS-only
* Input sanitization for all content fields
* Secure file uploads
* CSP headers
* Protection from:

  * XSS
  * CSRF
  * Clickjacking

### GDPR Requirements

* All data stored in EU
* Consent banner for cookie/analytics
* User deletion support
* Data export (optional)

---

# **7. Deployment & Release Model**

### Web CMS

* Deployed to Kubernetes
* Versioned releases
* Rollback enabled via previous container image
* CI/CD required (build → test → deploy)

### Web App

* Deployed via Vercel-like SSR or self-hosted Node SSR
* CDN caching for public pages
* Rollback: previous version kept in registry

---

# **8. Quality Assurance**

### Testing Requirements

* Unit tests (React, Next.js)
* Integration tests
* E2E tests (Playwright) for:

  * App Builder workflow
  * Listings CRUD
  * Approval flow
  * Chatbot
  * Search

### Accessibility Testing

* Lighthouse
* Screen reader manual tests
* Keyboard navigation tests

---

# **9. Acceptance Criteria (CMS & Web)**

### CMS

* All template/feature/toggle workflows functional
* Dynamic mobile preview updates instantly
* Listings moderation works end-to-end
* App Factory integration: builds can be triggered, monitored, and downloaded
* Notifications can be scheduled and delivered
* Audit Trail shows all admin actions
* Role-based UI enforcement working
* City Editor submissions appear correctly in moderation queue

### Citizen Web App

* Responsive and accessible
* Listing, search, events pages fully functional
* Chatbot responds with tenant-specific answers
* Ads display based on rules
* Profile + favorites functional
* All pages load under accepted latency thresholds
* No cross-tenant data exposure