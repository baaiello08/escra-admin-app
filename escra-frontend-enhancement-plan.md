# Escra Admin Portal – Frontend Enhancement Implementation Plan

This plan extends the existing `escra-frontend-implementation-plan.md` and describes how to implement the new UX, layout, and data enhancements requested for the admin UI. All changes are **frontend-only** and should continue to rely on mocked data through the typed API client until the backend is ready.

---

## 1. Global UI Enhancements

- [ ] Layout & Shell
  - [ ] Add a logout button to the lower-left panel of the app shell.
  - [ ] Implement / enhance the user profile module in the header:
    - [ ] Show user initials avatar.
    - [ ] Display dropdown menu for future profile, settings, and logout (wire logout to the new button and shared handler).
  - [ ] Ensure global typography uses black text for primary table and detail view content.

- [ ] Navigation & Tabs
  - [ ] Reorder sidebar so that sections appear as:
    - [ ] Dashboard
    - [ ] Tenants
    - [ ] Users
    - [ ] Identity / Persona (Onboarding)
    - [ ] Keys & Vault
    - [ ] Indexer & Ledger (combined)
    - [ ] Contracts & Automations (rename from Contracts & Workflows)
    - [ ] Billing & Usage
    - [ ] Security & Risk
    - [ ] System Health
    - [ ] Support
    - [ ] Roles & Permissions (visible but disabled for now)
  - [ ] Disable the Roles & Permissions tab:
    - [ ] Show it as present in the nav but visually muted and non-clickable (tooltip: “Coming soon”).

- [ ] KPI Strips
  - [ ] For each tab, create a small KPI strip at the top (e.g., 3–4 cards) showing relevant, high-level metrics.
  - [ ] Use shared KPI card components with title, value, and optional trend.

- [ ] Mock Data Strategy
  - [ ] Extend existing mock data to support new fields and KPIs, but:
    - [ ] Keep example counts small (e.g., 5–15 records per domain).
    - [ ] Centralize mocks per domain to avoid “mock data debt.”

---

## 2. Tenants Tab Enhancements

- [ ] Tenants Table
  - [ ] Ensure text color is black.
  - [ ] Add sortable columns: Name, Status, Plan, Region, Created At, Verification Status, Storage Used, Contract Count, Document Count.
  - [ ] Add richer filters:
    - [ ] Status (trial, active, suspended, terminated).
    - [ ] Plan (Essential, Pro, Growth, Enterprise).
    - [ ] Verification (KYC/KYB complete, pending, failed).
    - [ ] Region.
    - [ ] Created date range.
  - [ ] Add inline usage summary columns (e.g., storage and usage metrics).

- [ ] Row Actions & Popups
  - [ ] Add action icons: View, Edit, Delete.
  - [ ] On row click or View:
    - [ ] Open a tenant detail popup module with tabs/sections:
      - [ ] Overview (key metadata, KPIs, usage).
      - [ ] Users (list of users for this tenant with inline actions).
      - [ ] Roles (role assignments overview).
      - [ ] KYC/KYB (status and required information).
    - [ ] Allow editing tenant information in a clean, validated form.
  - [ ] From the Users tab in the tenant popup, enable launching a secondary popup for editing a user.

---

## 3. Users Tab Enhancements

- [ ] Users Table
  - [ ] Ensure text color is black.
  - [ ] Add sortable columns: Name, Email, Tenant, Roles, Status, Verification Level, Last Login, Storage/Usage summary.
  - [ ] Add richer filters:
    - [ ] Tenant.
    - [ ] Role(s).
    - [ ] Verification Level (KYC/KYB, Persona-related fields when ready).
    - [ ] Status.
    - [ ] Last login date range.

- [ ] Row Actions & Popups
  - [ ] Add action icons: View, Edit, Delete.
  - [ ] On row click or View, open a user detail popup module with:
    - [ ] Profile section: name, email, Escra ID, organization memberships.
    - [ ] Roles & Access: roles per tenant.
    - [ ] Identity & KYC: verification status, provider info placeholders.
    - [ ] Keys & Security: public key pair, 2FA status, recent security events.
    - [ ] Sessions: active sessions, recent logins, IPs.
    - [ ] Usage: storage and usage metrics.
    - [ ] On-chain Activity: list of on-chain events linked to this user (mocked, likely from an `userOnChainEvents` mock).

---

## 4. Keys & Vault Tab Enhancements

- [ ] Table & Data Model
  - [ ] Update the Key model/interfaces to:
    - [ ] Remove organization-level keys; keys are user-only.
    - [ ] Replace “purpose” column with “tenant”.
  - [ ] Table columns: User, Escra ID, Tenant, Key Type, Key Status, Last Used, Created At.
  - [ ] Add filters: Tenant, Key Type, Key Status, Last Used range.

- [ ] Row Actions & Detail View
  - [ ] Actions per row: Revoke, Reassign, Delete (use icon buttons and confirmation modals).
  - [ ] Remove any “Create Key” button from the UI.
  - [ ] On click/View:
    - [ ] Open a detail popup showing:
      - [ ] Key metadata and associations (user, tenant).
      - [ ] All on-chain activity for that key (mocked).
      - [ ] KPIs: contracts signed, documents signed, total signatures, last signature timestamp.

---

## 5. Indexer & Ledger (Combined Tab)

- [ ] Combine Existing Tabs
  - [ ] Merge any existing “Indexer” and “Ledger” routes into a single “Indexer & Ledger” view.
  - [ ] Ensure copy and labels are clear, with black text and descriptive headers.

- [ ] Off-chain Ledger Table
  - [ ] Model the UI loosely after lora.algokit.io explorer:
    - [ ] Table/grid of transaction-like events with columns:
      - [ ] Timestamp (replace “started” with “timestamp”).
      - [ ] Tenant.
      - [ ] User.
      - [ ] Key.
      - [ ] Contract.
      - [ ] Document.
      - [ ] Type (contract, document, task, signature, etc.).
      - [ ] Status.
    - [ ] Filters:
      - [ ] Type (multi-select).
      - [ ] Tenant.
      - [ ] User.
      - [ ] Key.
      - [ ] Contract/Document.
      - [ ] Date range (calendar).
  - [ ] Add KPIs: total events, contracts, documents, signatures, recent errors, etc.
  - [ ] Provide a detail drawer/popup for a transaction/event with full metadata.

---

## 6. Contracts & Automations Tab

- [ ] Renaming
  - [ ] Rename the tab and any related code from “Contracts & Workflows” to “Contracts & Automations”.

- [ ] Template Library UI
  - [ ] Build a library view:
    - [ ] Table/cards of templates with type, industry, usage counts, last updated.
    - [ ] Filters by category, industry, and status.
  - [ ] Template detail view:
    - [ ] Metadata, sample clauses, and linked automations.

- [ ] Automations
  - [ ] Represent automations as configurable flows (e.g., status changes, triggers, notifications).
  - [ ] Show a few example automations with mock data.

---

## 7. Billing & Usage Tab

- [ ] Split into Two Sub-tabs
  - [ ] Billing sub-tab:
    - [ ] Show plan tiers: Essential, Pro, Growth, Enterprise.
    - [ ] Support creation/display of custom Enterprise tiers/rates (for sales/BD).
    - [ ] Display subscription details, renewal info, and billing KPIs.
  - [ ] Usage sub-tab:
    - [ ] Show cost drivers: on-chain fees, ALGO locked in active contracts/documents, storage (object and DB), API calls, etc.
    - [ ] Provide charts and tables using mock data.

---

## 8. Security & Risk Tab

- [ ] OFAC/AML Monitoring UI
  - [ ] Convert this view into a compliance investigations dashboard:
    - [ ] Lists of flagged users, tenants, and transactions with risk ratings.
    - [ ] Filters: risk level, reason, date range, entity type.
    - [ ] Detail popup for each case with summary, links to related entities, and investigation status.

---

## 9. System Health Tab

- [ ] Service Inventory
  - [ ] Show health/status tiles or table rows for:
    - [ ] AWS.
    - [ ] Postgres.
    - [ ] DocuSign.
    - [ ] Adobe Sign.
    - [ ] Cloudflare.
    - [ ] Stripe.
    - [ ] HashiCorp Vault.
    - [ ] Slack.
    - [ ] Algorand blockchain.
    - [ ] Smart contract creation engine.
    - [ ] Onboarding engine (web2/web3 hybrid).
  - [ ] Each service: status icon, latency, error rate, last incident, mock data only.

---

## 10. Support Tab

- [ ] Ticket Dashboard
  - [ ] Create a ticket list view:
    - [ ] Columns: ID, Tenant, User, Subject, Status, Priority, Assignee, Created At, Updated At.
    - [ ] Filters: status, priority, tenant, assignee, date range.
  - [ ] Ticket Detail Popup:
    - [ ] Show full ticket information, customer context, timeline of updates.
    - [ ] Include references to linked JIRA tickets (IDs and statuses).
    - [ ] Provide areas for internal notes (mock only).

---

## 11. Identity / Persona (Onboarding) Tab

- [ ] Reposition in Nav
  - [ ] Place Identity/Persona directly under Tenants and Users in the sidebar.

- [ ] Onboarding & KYC/KYB Dashboard
  - [ ] Create views for:
    - [ ] Active onboardings.
    - [ ] Pending verifications.
    - [ ] Completed/failed verifications.
  - [ ] Include Persona-specific placeholders:
    - [ ] Verification status, risk signals, document types used, timestamps.
  - [ ] Provide filters by tenant, type (KYC vs KYB), risk level, and status.
  - [ ] All data remains mocked and routed through the existing API client; no live Persona integration yet.

---

## 12. Integration & Testing

- [ ] Ensure all new views use the shared API client and existing domain types, extending interfaces as needed.
- [ ] Keep all actions non-destructive and mocked for now (log calls to console or show toasts indicating “mock action”).
- [ ] Add/extend tests for:
  - [ ] Navigation and route availability.
  - [ ] Tenant and user detail popups.
  - [ ] Keys & Vault actions visibility.
  - [ ] Indexer & Ledger filters and detail drawer.
  - [ ] Identity/Persona onboarding list and filters.

This plan should be used together with:
- `escra-admin-implementation-plan.md`
- `escra-frontend-implementation-plan.md`
and the latest prompt that describes the desired UI and behavior per tab.
