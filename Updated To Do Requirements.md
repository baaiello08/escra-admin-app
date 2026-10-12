# Updated To Do Requirements

**Assessment Date:** 2025-12-18  
**Status:** Current implementation gaps and remaining work

---

## What Remains To Be Implemented

### 🔴 High Priority - Missing Backend APIs

#### 1. **Templates API** (Backend Missing)
- **Frontend Status:** `/admin/templates` page exists with full UI but uses hardcoded mock data
- **Backend Status:** No templates API, model, or repository exists
- **Files Needed:**
  - `backend/app/models/template.py` - Template model with status enum
  - `backend/app/repositories/template_repository.py` - Repository for template CRUD operations
  - `backend/app/api/v1/templates.py` - REST API endpoints
- **Endpoints Needed:**
  - `GET /api/v1/templates` - List templates (paginated, with filters)
  - `GET /api/v1/templates/{template_id}` - Get template by ID
  - `POST /api/v1/templates` - Create template
  - `PATCH /api/v1/templates/{template_id}` - Update template
  - `DELETE /api/v1/templates/{template_id}` - Delete template
- **Data Source:** TBD - Need to determine if templates are stored in Escra App database or separate collection

---

#### 2. **Treasury API** (Backend Missing)
- **Frontend Status:** `/admin/treasury` page exists with full UI but uses `MOCK_TREASURY_DATA` for:
  - Treasury wallet balance
  - Staking APY (6% hardcoded)
  - Main funding wallet total balance
  - Bank account information (hardcoded)
- **Backend Status:** No treasury API, model, or repository exists
- **Files Needed:**
  - `backend/app/models/treasury.py` - Treasury model (balances, staking config, bank account)
  - `backend/app/repositories/treasury_repository.py` - Repository for treasury data
  - `backend/app/api/v1/treasury.py` - REST API endpoints
- **Endpoints Needed:**
  - `GET /api/v1/treasury/balances` - Get ALGO balances (locked, funding wallet, treasury wallet, combined)
  - `GET /api/v1/treasury/staking` - Get staking configuration and yield calculations
  - `GET /api/v1/treasury/bank-account` - Get bank account information
  - `PATCH /api/v1/treasury/staking` - Update staking configuration (if needed)
- **Data Source:** TBD - May need to aggregate from contracts/documents (for locked ALGO) and external sources (for wallet balances, staking APY)

---

#### 3. **Health/System Health API** (Backend Missing)
- **Frontend Status:** `/admin/health` page exists with hardcoded service status data
- **Backend Status:** Only basic `/health` endpoint exists, no detailed service monitoring
- **Files Needed:**
  - `backend/app/models/health.py` - Service health model
  - `backend/app/repositories/health_repository.py` - Repository for health metrics (optional, may be real-time)
  - `backend/app/api/v1/health.py` - Enhanced health endpoints (or extend existing)
- **Endpoints Needed:**
  - `GET /api/v1/health/services` - Get detailed service health status (AWS, Postgres, MongoDB, Indexer, Persona, Algorand, etc.)
  - `GET /api/v1/health/metrics` - Get system metrics (response times, uptime, error rates)
- **Data Source:** Real-time health checks or cached metrics from monitoring system

---

### 🟡 Medium Priority - Missing Frontend API Client

#### 4. **Frontend API Client File Missing** ⚠️ CRITICAL
- **Issue:** `frontend/src/lib/api-client.ts` is referenced throughout the frontend but **does not exist**
- **Impact:** All frontend pages that import `apiClient` will fail
- **Files Needed:**
  - `frontend/src/lib/api-client.ts` - Centralized API client
- **Implementation Requirements:**
  - HTTP client (fetch or axios)
  - Authentication token handling (JWT from AuthContext)
  - Base URL configuration (`NEXT_PUBLIC_API_URL`)
  - Methods for all backend endpoints:
    - Authentication: `login()`, `logout()`, `refreshToken()`, `getCurrentUser()`
    - Tenants: `listTenants()`, `getTenant()`, `createTenant()`, `updateTenant()`, `deleteTenant()`
    - Users: `listUsers()`, `getUser()`, `createUser()`, `updateUser()`, `deleteUser()`
    - Contracts: `listContracts()`, `getContract()`
    - Documents: `listDocuments()`, `getDocument()`
    - Signatures: `listSignatureRequests()`, `getSignatureRequest()`, `listSignatureEvents()`, `getSignatureEvent()`
    - Indexer: `getIndexerStatus()`, `getIndexerConfig()`, `updateIndexerConfig()`, `startIndexer()`, `stopIndexer()`, `backfillIndexer()`, `indexNow()`, `listOnChainEvents()`, `listIndexerJobs()`
    - Persona: `listPersonaInquiries()`, `getPersonaInquiry()`, `createPersonaInquiry()`
    - Keys: `listKeys()`, `getKey()`, `createKey()`, `updateKey()`, `deleteKey()`
    - Billing: `getBillingConfig()`, `createBillingConfig()`, `updateBillingConfig()`, `listUsageMetrics()`, `createUsageMetric()`, `listBillingEvents()`, `createBillingEvent()`, `listPlanTiers()`
    - Security: `getSecuritySettings()`, `createSecuritySettings()`, `updateSecuritySettings()`, `listSecurityEvents()`, `createSecurityEvent()`, `getSecurityEvent()`, `updateSecurityEvent()`, `listAbuseCases()`, `createAbuseCase()`, `getAbuseCase()`, `updateAbuseCase()`, `listFraudCases()`, `createFraudCase()`, `getFraudCase()`, `updateFraudCase()`
    - Support: `listSupportCases()`, `createSupportCase()`, `getSupportCase()`, `updateSupportCase()`, `listImpersonations()`, `createImpersonation()`, `getImpersonation()`, `updateImpersonation()`, `listAnnouncements()`, `createAnnouncement()`, `getAnnouncement()`, `updateAnnouncement()`
    - Audit: `listAuditLogs()`, `getAuditLog()`
    - Templates: `listTemplates()`, `getTemplate()`, `createTemplate()`, `updateTemplate()`, `deleteTemplate()` (when implemented)
    - Treasury: `getTreasuryBalances()`, `getTreasuryStaking()`, `getTreasuryBankAccount()` (when implemented)
    - Health: `getHealthServices()`, `getHealthMetrics()` (when implemented)
  - Error handling (network errors, API errors, authentication errors)
  - TypeScript types matching backend response models
  - Pagination parameter handling (`skip`, `limit`, `page`, `page_size`)

---

### 🟡 Medium Priority - Incomplete Backend Features

#### 5. **Key Management Actions**
- **Frontend Status:** 
  - `keys/page.tsx` has TODO for rekey functionality (line 337)
  - Revoke key action exists but may need backend enhancement
- **Backend Status:** 
  - `DELETE /api/v1/keys/{key_id}` exists (revoke/soft delete)
  - No dedicated rekey endpoint
- **Endpoints Needed:**
  - `POST /api/v1/keys/{key_id}/rekey` - Rotate/rekey a key
- **Implementation:** Create new key, update references, optionally revoke old key

---

#### 6. **User Key Management**
- **Frontend Status:**
  - `users/page.tsx` has TODOs for:
    - Rekey user functionality (line 2230)
    - Remove user key functionality (line 2240)
- **Backend Status:** No user-specific key management endpoints
- **Endpoints Needed:**
  - `POST /api/v1/users/{user_id}/keys/rekey` - Rekey all keys for a user
  - `DELETE /api/v1/users/{user_id}/keys/{key_id}` - Remove a specific key from a user
  - `GET /api/v1/users/{user_id}/keys` - List all keys for a user (may already exist via keys API with user_id filter)

---

#### 7. **Tenant Lifecycle Actions**
- **Frontend Status:** May have UI for these actions (need to verify)
- **Backend Status:** Basic CRUD exists, but no lifecycle management endpoints
- **Endpoints Needed:**
  - `POST /api/v1/tenants/{tenant_id}/suspend` - Suspend a tenant
  - `POST /api/v1/tenants/{tenant_id}/terminate` - Terminate a tenant
  - `POST /api/v1/tenants/{tenant_id}/export` - Export tenant data (GDPR/offboarding)
  - `GET /api/v1/tenants/{tenant_id}/export-status` - Check export job status
- **Implementation:** Update tenant status, handle data export workflows

---

### 🟢 Low Priority - Frontend Enhancements

#### 8. **Templates Page Actions**
- **Frontend Status:** `templates/page.tsx` has TODO for delete functionality (line 169)
- **Backend Dependency:** Requires Templates API to be implemented first
- **Action Needed:** Once Templates API is created, implement delete action in frontend

---

#### 9. **Billing Page Enhancements**
- **Frontend Status:** `billing/page.tsx` has TODOs:
  - Calculate profit (ARR - operating expenses) (line 1680)
  - Remove user functionality (line 2567)
- **Backend Dependency:** May need additional endpoints for profit calculations
- **Action Needed:** Implement profit calculation logic (frontend or backend)

---

#### 10. **Onboarding Page - Passkey Management**
- **Frontend Status:** `onboarding/page.tsx` has TODO for passkey registration (line 2392)
- **Backend Status:** No passkey management endpoints
- **Endpoints Needed (if implementing):**
  - `POST /api/v1/users/{user_id}/passkeys` - Register passkey
  - `GET /api/v1/users/{user_id}/passkeys` - List user passkeys
  - `DELETE /api/v1/users/{user_id}/passkeys/{passkey_id}` - Remove passkey
- **Note:** This may be handled by a separate authentication service

---

## Summary by Priority

### 🔴 High Priority (Blocks Functionality)
1. **Templates Backend API** - Frontend ready, backend missing
2. **Treasury Backend API** - Frontend ready, backend missing
3. **Frontend API Client File Creation** - **CRITICAL** - File is missing but referenced everywhere
4. **Health/Services Monitoring API** - Frontend ready, backend missing

### 🟡 Medium Priority (Enhances Functionality)
5. **Key Rekey Endpoint** - Frontend has placeholder, backend missing
6. **User Key Management Endpoints** - Frontend has placeholders, backend missing
7. **Tenant Lifecycle Actions** - Backend missing (suspend/terminate/export)

### 🟢 Low Priority (Nice to Have)
8. **Templates Delete Action** - Depends on Templates API
9. **Billing Profit Calculations** - Enhancement feature
10. **Passkey Management** - May be handled by separate service

---

## Critical Gap Identified

**The frontend API client file (`frontend/src/lib/api-client.ts`) is missing but is referenced throughout the entire frontend codebase.** This is a **critical blocker** that should be addressed first, as it will prevent the frontend from connecting to any backend APIs.

---

## Implementation Order Recommendation

1. **First:** Create `frontend/src/lib/api-client.ts` with all API methods
2. **Second:** Implement Templates Backend API (high demand from frontend)
3. **Third:** Implement Treasury Backend API (high demand from frontend)
4. **Fourth:** Implement Health/Services Monitoring API
5. **Fifth:** Add Key Management enhancements (rekey endpoints)
6. **Sixth:** Add User Key Management endpoints
7. **Seventh:** Add Tenant Lifecycle Actions
8. **Eighth:** Frontend enhancements (delete actions, profit calculations, etc.)

---

## Notes

- All existing backend APIs (Contracts, Documents, Signatures, Indexer, Persona, Keys, Billing, Security, Support, Audit, Tenants, Users) are **fully implemented** and documented in `API_DOCUMENTATION.md`
- Frontend pages are **comprehensively implemented** with full UI, but some rely on mock data pending backend API implementation
- The codebase follows good architectural patterns (repositories, services, models) making it straightforward to add new APIs

---

**Last Updated:** 2025-12-18
