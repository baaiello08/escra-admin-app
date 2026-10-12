# Escra Admin Portal – Frontend Implementation Plan

This plan focuses on building the **Next.js + React + TypeScript admin UI** for Escra in a way that:

- Aligns with the existing `escra-admin-implementation-plan.md` (backend-focused).
- Integrates cleanly with the backend API once it is ready.
- Starts with **User and Tenant management**, then progressively covers all admin domains.
- Allows mocked data initially, but is architected for easy swap-in of real APIs (including MongoDB-backed data and Persona integration).

---

## 1. Frontend Architecture & Project Setup

- [ ] Create `/frontend` Next.js (App Router or Pages Router) + TypeScript app.
- [ ] Establish base structure:
  - [ ] `app/` or `pages/` – routing.
  - [ ] `components/` – shared UI components.
  - [ ] `modules/` – feature/domain-specific UI (e.g. `tenants`, `users`, `rbac`, `keys`, `ledger`, etc.).
  - [ ] `lib/` – utilities (API client, auth, RBAC helpers).
  - [ ] `styles/` – global styles or Tailwind config if used.
- [ ] Decide on UI kit (e.g. shadcn/ui, Headless UI, or minimal custom components).
- [ ] Add basic tooling:
  - [ ] ESLint + Prettier.
  - [ ] Jest/React Testing Library (and/or Playwright/Cypress for e2e later).
  - [ ] Simple env configuration for frontend (NEXT_PUBLIC_API_BASE_URL, etc).

**Alignment with backend plan:**  
Frontend will assume a versioned API (`/api/v1/...`) with domain-based groupings (Tenants, Users, RBAC, Keys, Ledger, etc.) as defined in the backend implementation plan.

---

## 2. Layout, Navigation & Access Context

- [ ] Implement global layout:
  - [ ] Top bar with environment indicator (dev/stage/prod) and current user.
  - [ ] Left sidebar navigation with primary sections:
    - [ ] Dashboard (optional high-level overview).
    - [ ] Tenants.
    - [ ] Users.
    - [ ] Roles & Permissions.
    - [ ] Keys & Vault.
    - [ ] Indexer & Ledger.
    - [ ] Contracts & Workflows.
    - [ ] Billing & Usage.
    - [ ] Security & Risk.
    - [ ] System Health.
    - [ ] Support.
    - [ ] Identity / Persona.
- [ ] Represent **global super admin** vs **tenant admin** scopes:
  - [ ] Create a context (e.g. `AdminScopeContext`) to track:
    - Current scope (global vs tenant-specific).
    - Selected tenant (if in tenant-admin view).
  - [ ] Condition navigation items and content based on RBAC claims provided by backend.

**Backend connection:**  
Later, the current user and RBAC claims will be fetched from an auth/identity endpoint, but initially they can be mocked via a context provider.

---

## 3. API Client Layer & Data Fetching Strategy

- [ ] Implement a centralized API client in `lib/api-client.ts`:
  - [ ] Base URL from `NEXT_PUBLIC_API_BASE_URL`.
  - [ ] Standard error handling and typed responses.
  - [ ] Optional integration with a data fetching library (React Query/SWR) for caching and status management.
- [ ] Define TypeScript interfaces/types mirroring backend schemas:
  - [ ] `Tenant`, `TenantStatus`, `User`, `Role`, `Permission`, `Key`, `LedgerEntry`, `Contract`, `WorkflowConfig`, `UsageMetrics`, `SecurityEvent`, `SupportCase`, `PersonaVerification`, `IndexerStatus`, etc.
- [ ] Start with **mock implementations**:
  - [ ] Use in-memory or static JSON mocks behind the API client when the backend is not ready.
  - [ ] Guard all backend calls through the API client so actual HTTP integration is drop-in later.

**Backend connection:**  
Once backend endpoints are available, replace mocked client methods with real `fetch`/Axios calls while keeping the same TypeScript signatures.

---

## 4. User & Tenant Management (First Priority)

### 4.1 Tenant Management UI

- [ ] Tenants List Page:
  - [ ] Table with columns: name, status (trial/active/suspended), plan, region, created date, key metrics.
  - [ ] Filters: status, plan, region, created date.
  - [ ] Actions: view details, impersonate tenant admin (future), lock/suspend tenant (button disabled or mocked for now).
- [ ] Tenant Detail Page:
  - [ ] Tabs: Overview, Profile, Settings, Lifecycle, Indexer/Ledger tab shortcut.
  - [ ] Profile: legal entity info, billing entity, contacts.
  - [ ] Settings: data residency, defaults (currency, timezone, language), retention policies.
  - [ ] Lifecycle: status, activation/suspension/termination controls (mock), export/offboarding panel.

### 4.2 User Management UI

- [ ] Users List Page:
  - [ ] Table with columns: name, email, tenant, role(s), status, verification level, last login.
  - [ ] Filters: tenant, role, status, verification level, last login window.
  - [ ] Basic activity indicators (e.g. active users over time as summary widget).
- [ ] User Detail Page:
  - [ ] Sections: Profile, Identity & Persona (placeholder), Sessions, PII & Privacy, Roles & Access.
  - [ ] Profile: core fields, tenant membership, roles per tenant.
  - [ ] Identity & Persona: display placeholders for verification status, risk flags, provider logs.
  - [ ] PII & Privacy: show structure for “view PII” with just-in-time reveal and DSR workflows (disabled/mocked).
  - [ ] Auth Controls: password reset trigger, force logout, MFA enforcement (mocked actions).

**Backend connection:**  
Tenant and user pages will ultimately call `/tenants` and `/users` endpoints implemented per the backend plan, with support for pagination, filters, and sorting.

---

## 5. Other Domain UIs (Skeletons Aligned to Backend Plan)

After User & Tenant management are in place, add skeleton UIs for the remaining domains:

### 5.1 Roles, Permissions & Policy

- [ ] Role matrix view (system roles, tenant roles, custom roles).
- [ ] Role detail with permissions checklist grouped by scopes (identity, contracts, documents, ledger, billing, admin, keys).
- [ ] Access review report view (export-ready tables).

### 5.2 Keys & Vault Management

- [ ] Key inventory table with filters (tenant, type, status).
- [ ] Key detail view with metadata (purpose, algorithm, last use, related wallet address), lifecycle events, and placeholder buttons for rotation/revoke.
- [ ] Vault mapping view: logical key names → Vault paths/policies (read-only for now).

### 5.3 Indexer & Ledger

- [ ] Indexer configuration view:
  - [ ] Inputs for Algorand network, endpoints, credentials (masked placeholders), polling interval, backfill ranges.
- [ ] Indexer job management view:
  - [ ] List jobs, status (running/paused/failed), last processed round, lag metrics.
  - [ ] Buttons for start/stop/pause/resume/backfill (disabled or mocked).
- [ ] Ledger views:
  - [ ] Contract-level and tenant-level views tying on-chain and off-chain data (placeholder tables using mock data).
  - [ ] Reconciliation dashboard skeleton showing mismatches and health indicators.

### 5.4 Contracts, Documents & Workflow Configuration

- [ ] Global defaults and template library management UI.
- [ ] Tenant-specific workflow builder: status flows, conditional steps, on-chain mapping (represented visually or as structured forms).

### 5.5 Billing, Security, System Health, Support, Persona

- [ ] Billing & Usage: plan cards, usage charts (mocked), threshold alerts.
- [ ] Security & Risk: global/tenant security settings, abuse/fraud cases list.
- [ ] System Health: service health dashboard, background job monitoring, feature flag console.
- [ ] Support: impersonation workflows, support case list/detail, banner/announcement tools.
- [ ] Identity/Persona: overview of verification pipelines, cases, and status summaries (all mocked until backend is wired).

---

## 6. State Management, RBAC Guards & Error Handling

- [ ] Implement lightweight state management:
  - [ ] Prefer query libraries (React Query/SWR) for server state.
  - [ ] Use React context or Zustand/Recoil for UI state (current tenant, admin scope, feature flags).
- [ ] RBAC on the frontend:
  - [ ] Create a permissions helper that takes user roles/claims (from backend) and conditions UI elements (buttons, routes).
  - [ ] Hide or disable actions based on RBAC rather than relying solely on backend errors.
- [ ] Error handling UX:
  - [ ] Global error boundary for catastrophic failures.
  - [ ] Per-page and per-request error states with retry options and structured error messages.

---

## 7. Progressive Backend Integration

As the backend from `escra-admin-implementation-plan.md` comes online:

- [ ] Wire API client methods to real endpoints:
  - [ ] Tenants and users first.
  - [ ] Then roles/permissions, keys, ledger/indexer, billing, security, support, Persona.
- [ ] Replace mock data step by step, maintaining TypeScript interfaces.
- [ ] Add optimistic updates or refetch patterns where appropriate.
- [ ] Validate that filters, sorting, and pagination match backend capabilities.

---

## 8. Testing, Hardening & Handoff

- [ ] Write component and page-level tests for critical screens (Tenants, Users, RBAC, Indexer).
- [ ] Add basic accessibility checks (labels, focus states, keyboard navigation).
- [ ] Verify that sensitive actions are gated visually (confirm modals, RBAC guards).
- [ ] Document:
  - [ ] How to run the frontend locally.
  - [ ] How to switch between mock/real API.
  - [ ] How frontend aligns with backend domains and data contracts.

This frontend plan is designed to sit alongside `escra-admin-implementation-plan.md`, with clear references to the same domains and a clean integration path once the backend API is implemented.
