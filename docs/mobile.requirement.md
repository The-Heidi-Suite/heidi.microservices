# HEIDI — Mobile App

**Requirements & Implementation Plan (Flutter)**

This is the updated, authoritative requirements and implementation plan for the HEIDI mobile applications (Flutter). It aligns with the Backend, Web CMS and App Factory architecture, supports tenant/feature modularity, and is intended for engineering, QA, product and client sign-off.

---

## 1. Purpose & Scope

Deliver a single **Flutter** codebase that produces white-label Android and iOS apps per city (Template A / Template B).
Apps must be modular (feature packages), tenant-aware, secure, accessible, and functionally aligned with the Web CMS and Citizen Web App. This document covers full scope (not an MVP).

---

## 2. Actors / Roles in-app

* **Authenticated Citizen / Editor (Contributor)** — create submissions (listings, reports); submissions require City Admin approval.
* **City Admin / Super City Admin** — may use privileged screens (if included) — moderation, quick dashboards.
* **Anonymous Citizen** — browse content, use chatbot, view events and alerts.
* **DevOps / Release Manager** — handles build/sign/publish flows (CI/CD & Orchestrator).

(Authorization and role enforcement are server-side responsibilities; app enforces UI gating.)

---

## 3. Platforms & Tech Stack

* **Framework:** Flutter (single codebase for Android + iOS)
* **State management:** Provider / Riverpod / Bloc (team choice — pick one and document conventions)
* **Persistence:** Hive or SQLite for local cache and offline queue
* **Networking:** Dio / http with retry/backoff and centralized interceptors (auth, tenant, error handling)
* **Maps:** Mapbox or Leaflet via plugin (license decision)
* **Crash & Performance:** Sentry
* **CI/CD:** Docker Linux runners for Android builds, hosted macOS (Bitrise/Codemagic) for iOS; orchestrated by App Factory.
* **Signing:** Fastlane for iOS lanes (match) and Android keystore injected from Vault during build.

---

## 4. App Generation & Modularity

* **Template-driven UI:** app visual structure (navigation, home layout, major UX patterns) determined by Template A or B; template selection is an App Factory input.
* **Feature Modules:** each feature implemented as an isolated Flutter package (plugin-like): Listings, Search, Events, Maps/POI, Job Matching, Business Community, Chatbot, Live Chat, Ads, Surveys, Defect Reporter, Multilingualism, etc.
* **Enable/Disable at Build-time:** App Factory merges selected feature packages and injects config (bundle id, icons, theme) to produce a whitelabeled project. Where safe, some features can be toggled at runtime by remote config.

---

## 5. Core Functional Areas & Screens

### Global / Shell

* Splash screen (per-tenant branding)
* Onboarding (optional)
* Home / Dashboard (cards/grid depending on template)
* Global Search (access from top/home)
* Bottom navigation or drawer per template
* Profile & Settings

### Listings (core)

* Categories → Subcategories → Listing list
* Listing card (summary) with quick actions (call, directions, share)
* Listing detail: gallery, description, contact, opening hours, tags, reviews/ratings (if enabled)
* Create listing flow (Editor): form, media capture/upload, geolocation, submit for approval
* Listing moderation screens (for City Admin, if included)

### Events & News

* Event list & calendar view
* Event detail with RSVP/add to calendar

### Maps & POI

* Map view with POI markers, cluster handling, filters, deep linking from listing

### Job Matching

* Job list & detail, apply flow (attach CV), application status (if backend supports)

### Business Community

* Community feed, create post, comment, moderate

### Chatbot & Live Chat

* Floating chat launcher (tenant-scoped RAG backend)
* Conversation UI with quick-replies, source citations, attachments
* Live chat integration (if enabled; sockets or managed service)

### Notifications

* In-app notification center
* Push notification handling and deep links to screens

### Ads & Monetization

* Ad placements controlled by CMS rules (banner, interstitial, feed items)
* Respect frequency rules and do not block core flows

### Contribution Flows

* Report/Defect submission (with media + location)
* Survey forms and responses

---

## 6. Integrations & API Mapping (high-level)

App interacts only with backend API endpoints described in the Backend System Design:

* **Auth Service:** login, refresh, user info
* **Core Service:** categories, listings CRUD, approval endpoints
* **Search Service:** search & suggestions
* **City Management:** tenant config (templates, theme, enabled features)
* **ProjectGen / Build API:** read-only for app version info if needed
* **Notification Service:** register device, notification preferences
* **Chatbot Service:** POST /chat/:tenantId/query (RAG)
* **Upload Service:** presigned URL flow for media uploads
* **Analytics:** event tracking
* **Audit:** optional client-side event that server records

All calls must contain tenant context (token claim or header) and follow RBAC rules.

---

## 7. Offline, Caching & Sync

* **Local cache for critical reads:** listings list, last viewed items, favorites, last search results.
* **Drafts & Offline create:** queue create-listing/report actions; background retry when online; surface status in UI.
* **Cache invalidation:** TTL from server, manual Pull-to-refresh.
* **Sync model:** optimistic queue with conflict handling (show conflict UI if needed).
* **Storage:** encrypted local DB for sensitive info if stored.

---

## 8. Push Notifications & Deep Links

* **Push registration:** app registers FCM/APNS token via Notification Service.
* **Deep linking:** notifications and external links open specific app screens (listing, event, chat) and pass necessary params.
* **Permission UX:** clear explanation & settings to control notifications.
* **Silent notifications:** optionally used for background sync where platform policies allow.

---

## 9. Security & Privacy

* **Transport:** TLS only.
* **Auth:** JWT access + refresh flow; tokens stored securely (Keychain/Keystore).
* **Input sanitization:** sanitize rich content before display.
* **Media uploads:** use presigned URL pattern; validate content server-side.
* **GDPR:** data deletion and export endpoints supported in backend; app exposes user data export & delete flows.
* **Secrets:** no hard-coded secrets in mobile app; any environment config injected at build-time by App Factory.
* **Optional:** certificate pinning (requires sign-off; increases maintenance for cert rotations).

---

## 10. Accessibility

* WCAG 2.1 AA mobile guidance:

  * Semantic widgets & accessibility labels
  * Large tappable areas (≥44x44)
  * Proper contrast & high-contrast mode
  * Support for system font scaling
  * Keyboard & external input compatibility (where applicable)
  * Screen-reader validation (VoiceOver/TalkBack)

---

## 11. Performance Targets & Non-functional

* **Cold start:** target ≤ 2.5s on mid-range devices.
* **List scroll:** smooth 60fps where possible (use efficient list rendering, pagination).
* **Network:** aim for <500ms backend response for search & listing loads (depends on network).
* **App size:** minimize dependencies and assets; monitor AAB/IPA size.
* **Memory:** keep steady-state memory under mid-range thresholds.

---

## 12. Testing & QA

* **Unit tests:** for modules & business logic.
* **Widget tests:** for important UI components.
* **Integration tests:** for feature flows (create listing, search, apply).
* **E2E tests:** Flutter integration tests or Appium for critical flows.
* **Accessibility checks:** automated + manual voice-over tests.
* **Beta testing:** Firebase App Distribution (Android) & TestFlight (iOS).

---

## 13. CI/CD & App Factory Integration

* **Orchestrator:** App Factory prepares generated Flutter project and triggers builds.
* **Android builds:** Linux Docker builders handle `flutter build appbundle`.
* **iOS builds:** hosted macOS (Bitrise/Codemagic) running Fastlane lanes for signing & TestFlight/App Store upload.
* **Tests in CI:** run unit & widget tests on CI before artifact creation.
* **Artifacts:** signed AAB/IPA stored in object storage with build metadata.
* **Versioning:** app version and build number injected from CMS metadata.

---

## 14. Release & Store Requirements

* **Store metadata:** privacy URL, contact email, screenshots provided per tenant via CMS or by Release Manager.
* **Permissions justification:** iOS permission strings required in app; CMS must supply explanations per tenant.
* **Staged rollout:** use staged rollout in Play Store; phased release to App Store.
* **Legal compliance:** ensure privacy & consent text is present and localized.

---

## 15. Observability & Crash Reporting

* **Sentry:** crash & performance monitoring.
* **Analytics:** usage events posted to Analytics Service.
* **Client logs:** sample logs shipped (rate-limited) for debugging.
* **Dashboards:** track crash-free users, build versions in the wild, key feature usage.

---

## 16. Acceptance Criteria

* Tenant theme, branding and enabled features are applied correctly per build.
* Listings: create (Editor) → moderation (City Admin) → publish end-to-end works.
* Search & map flows return correct results for the tenant.
* Chatbot returns tenant-specific answers with citations if applicable.
* Push notifications delivered and deep link to correct app screen.
* Offline drafts queue & sync works reliably.
* Accessibility basic checks pass (labels, focus order, scaling).
* CI pipeline can build Android and iOS artifacts using generated project and injected secrets.

---

## 17. Deliverables (Mobile Team)

* Flutter monorepo scaffold with:

  * Template A & B example projects
  * Feature packages for Listings & Chatbot (reference)
  * Shared libs (network, auth, tenant-context, storage)
* Build & CI pipeline configs (Android Docker images + iOS Fastlane lanes)
* Code-level documentation & module integration guide
* E2E test suite and QA test plan
* Accessibility report and remediation steps
* Release runbook (how to build, sign, publish, rollback)
