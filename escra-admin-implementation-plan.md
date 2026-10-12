# Escra Admin Portal – Implementation Plan

## 0. Architecture & Tech Stack Decision

- [ ] Confirm backend primary stack: Python (FastAPI or Django REST) + MongoDB.
- [ ] Define where Node.js is beneficial (e.g. blockchain indexer, webhooks, background workers).
- [ ] Choose AWS deployment baseline:
  - [ ] ECS Fargate (preferred for containerized services)
  - [ ] or EC2 + ALB, or Lambda for specific functions.
- [ ] Define service boundaries:
  - [ ] Core API (Escra Admin API)
  - [ ] Background jobs / indexers
  - [ ] Frontend (Next.js)
- [ ] Capture SOC2-aligned architecture principles:
  - [ ] RBAC
  - [ ] Tenant isolation
  - [ ] Logging & audit trails
  - [ ] Secure secrets management (Vault / AWS Secrets Manager)
  - [ ] Environment-based configuration.

---

## 1. Repository & Project Setup

- [ ] Create monorepo or multi-repo strategy:
  - [ ] `/backend` – Python API
  - [ ] `/workers` – Node.js workers (optional, future)
  - [ ] `/frontend` – Next.js (React + TypeScript)
  - [ ] `/infra` – IaC (Terraform / CDK) and deployment configuration.
- [ ] Initialize Git, branch strategy, and coding standards.
- [ ] Configure basic CI skeleton (GitHub Actions / GitLab CI).

---

## 2. Backend Scaffold (Step 1 from prompt)

- [ ] Initialize Python project (FastAPI or Django REST):
  - [ ] Define entrypoint (`main.py` / `wsgi.py` / `asgi.py`).
  - [ ] Add dependency management (Poetry / pip-tools / requirements.txt).
- [ ] Define backend structure:
  - [ ] `api/` – routers/controllers grouped by domain.
  - [ ] `services/` – business logic.
  - [ ] `repositories/` – MongoDB data access.
  - [ ] `models/` – domain models + Pydantic/serializers.
  - [ ] `core/` – config, security, logging, middleware.
  - [ ] `tests/` – unit + integration tests.
- [ ] Implement core middleware:
  - [ ] Authentication & RBAC hooks.
  - [ ] Tenant resolution (header/token-based).
  - [ ] Request/response logging.
  - [ ] Audit logging hook (event emitter).

---

## 3. Docker & Environment Setup (Step 2)

- [ ] Create `Dockerfile` for backend:
  - [ ] Multi-stage build (builder + runtime).
  - [ ] Non-root user, minimal image, healthcheck.
- [ ] Create `docker-compose.yaml`:
  - [ ] Backend service.
  - [ ] MongoDB.
  - [ ] Optional: local Vault/dev secrets, message queue (e.g. SQS emulator / RabbitMQ).
- [ ] Define environment configs:
  - [ ] `.env.local`, `.env.dev`, `.env.staging`, `.env.prod`.
  - [ ] Variables for Mongo URI, JWT/auth config, Vault/Secrets, AWS resources.
- [ ] Document local dev workflow: `make up`, `make test`, etc.

---

## 4. Data Model Design (Step 3)

Design MongoDB collections & models for core domains:

- [ ] Tenants & Organizations
  - [ ] Tenant metadata: status, plan, region, created date, lifecycle state.
  - [ ] Org profile: legal entity, billing entity, contacts, residency, defaults.
- [ ] Users & Identities
  - [ ] User profile, roles, status, verification level, linked identities, sessions.
  - [ ] PII classification, data subject request references.
- [ ] Roles, Permissions & Policy
  - [ ] System roles, tenant roles, custom role definitions, permission matrix, policy bundles.
- [ ] Keys & Vault
  - [ ] Key inventory, mappings to users/orgs, Vault path + policies, lifecycle events.
- [ ] Ledger & Audit
  - [ ] On-chain entries (Algorand app IDs, NFTs, TX history).
  - [ ] Off-chain indexer entries, derived events, reconciliation metadata.
  - [ ] Tamper-evident audit logs (append-only pattern).
- [ ] Contracts, Documents & Workflows
  - [ ] Contract types, templates, workflows, status flows, mapping to on-chain actions.
- [ ] Billing, Plans & Usage
  - [ ] Plan tiers, entitlements, billing configuration, metered usage, cost breakdowns.
- [ ] Security, Compliance & Risk
  - [ ] Global & tenant security config, abuse flags, fraud cases, evidence references.
- [ ] System Health & Operations
  - [ ] Service status snapshots, job runs, retries, feature flags.
- [ ] Support & Internal Tools
  - [ ] Impersonation sessions, support cases, announcements/banners.

---

## 5. API Design & Implementation (Step 4)

- [ ] Define API style:
  - [ ] REST (versioned: `/api/v1/...`) or GraphQL (with clear schema).
- [ ] Establish common concerns:
  - [ ] Pagination, filtering, sorting query params.
  - [ ] Error format (standardized error envelope).
  - [ ] Typed request/response schemas (Pydantic) suitable for TS client generation.
- [ ] Implement endpoints by domain (MVP pass):

  - [ ] Tenant & Organization Management
    - [ ] List tenants, tenant detail, create/update, lifecycle actions, export/offboarding.
  - [ ] User & Identity Management
    - [ ] User directory search, profile, PII access flows, auth controls, invitations.
  - [ ] Roles, Permissions & Policy
    - [ ] Manage system roles, tenant roles, permissions matrix, access review APIs.
  - [ ] Key & Vault Management
    - [ ] Key inventory, mapping, lifecycle operations (rotate/revoke), Vault metadata.
  - [ ] Ledger & Audit
    - [ ] Unified ledger queries, on-chain/off-chain views, reconciliation tools, exports.
  - [ ] Contract, Document & Workflow Config
    - [ ] Global defaults, tenant config, workflow builder, collaboration settings.
  - [ ] Billing, Plans & Usage
    - [ ] Plan management, billing config, usage analytics, threshold alerts.
  - [ ] Security, Compliance & Risk
    - [ ] Security settings, compliance evidence, abuse/fraud case APIs.
  - [ ] System Health, Observability & Operations
    - [ ] Service health, job/queue monitoring, config & feature flag endpoints.
  - [ ] Support & Internal Tools
    - [ ] Impersonation lifecycle, support cases, announcements/communications.

---

## 6. SOC2, Security & Compliance Foundations

- [ ] Implement RBAC:
  - [ ] Define system roles (super admin, support, compliance, ops).
  - [ ] Tenant roles (org admin, contract owner, signer only, viewer, auditor).
  - [ ] Custom role model with fine-grained scopes.
- [ ] Logging & Audit Trails:
  - [ ] Central structured logging (JSON).
  - [ ] Audit log events for admin/tenant/user actions.
- [ ] Secrets & Config:
  - [ ] Integrate with Vault / AWS Secrets Manager.
  - [ ] Strict separation of envs; no secrets in code or images.
- [ ] Data privacy:
  - [ ] PII access controls, redaction/anonymization routines.
  - [ ] Data subject request workflows (export/delete/restrict).

---

## 7. Frontend Scaffold (Next.js + React + TS)

- [ ] Initialize Next.js + TypeScript app in `/frontend`.
- [ ] Set up core layout:
  - [ ] Global super admin vs tenant admin spaces.
  - [ ] Left nav by domain (Tenants, Users, Roles, Keys, Ledger, Contracts, Billing, Security, Ops, Support).
- [ ] Configure API client:
  - [ ] Typed client (OpenAPI/GraphQL codegen).
  - [ ] Auth handling, tenant context, error handling.
- [ ] Build shared UI components:
  - [ ] Tables with filters, detail drawers, modals, step wizards.
  - [ ] Audit log viewer, impersonation banner, risk warning dialogs.
- [ ] Implement initial pages:
  - [ ] Tenant overview + tenant profile.
  - [ ] User directory + user detail.
  - [ ] Basic RBAC management UI.
  - [ ] Service health dashboard skeleton.

---

## 8. Observability & Operations

- [ ] Integrate metrics and traces (e.g. OpenTelemetry).
- [ ] Add healthcheck endpoints and readiness/liveness probes.
- [ ] Implement job/queue monitoring views.
- [ ] Create admin screens for config and feature flags.

---

## 9. AWS Deployment & CI/CD

- [ ] Define IaC for:
  - [ ] VPC, subnets, security groups.
  - [ ] ECS cluster or EC2 ASG + ALB; or Lambda where relevant.
  - [ ] MongoDB (managed Atlas or self-hosted on AWS).
- [ ] Implement CI/CD pipeline:
  - [ ] Build & push Docker images.
  - [ ] Run tests and security checks.
  - [ ] Deploy to dev/staging/prod environments.
- [ ] Add environment-specific configuration and runtime flags.

---

## 10. Hardening, Testing & Rollout

- [ ] Add automated tests:
  - [ ] Unit tests for services & models.
  - [ ] API integration tests.
  - [ ] Basic frontend tests (component + e2e).
- [ ] Security & compliance review:
  - [ ] RBAC coverage, audit log completeness, secrets handling.
  - [ ] Data residency controls per tenant.
- [ ] Internal alpha:
  - [ ] Use admin portal for test tenants and demo data.
- [ ] Iterative domain expansion:
  - [ ] Flesh out advanced features (reconciliation tools, workflow builders, SOC2 evidence exports, fraud case management).
