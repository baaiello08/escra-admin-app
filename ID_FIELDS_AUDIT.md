# ID Fields Audit - Escra Admin Portal

## Summary
This document lists all ID fields used across the application and identifies cleanup opportunities.

**Last Updated**: 2024-01-28

---

## Core Entity IDs (BaseEntity)

### All Entities
- **`id`** (BaseEntity)
  - **Type**: UUIDv7 (private ID)
  - **Purpose**: System/internal identifier
  - **Usage**: Backend operations, database primary key
  - **Note**: Same value as `escra_private_*_id` for all entities

---

## Organization/Tenant IDs

### Tenant Entity
- **`id`** (BaseEntity)
  - **Type**: UUIDv7
  - **Same as**: `escra_private_org_id`
  
- **`escra_public_org_id`**
  - **Type**: Formatted string (e.g., `ORG-9T2Q-K3WN`)
  - **Purpose**: Public-facing organization identifier
  - **Usage**: UI display, API filtering, relationships
  - **Format**: `ORG-XXXX-XXXX`
  
- **`escra_private_org_id`**
  - **Type**: UUIDv7
  - **Purpose**: System/internal identifier
  - **Usage**: Backend operations
  - **Same as**: `id`

---

## User IDs

### User Entity
- **`id`** (BaseEntity)
  - **Type**: UUIDv7
  - **Same as**: `escra_private_user_id`
  
- **`escra_public_user_id`**
  - **Type**: Formatted string (e.g., `USR-3PJ9-K2DT`)
  - **Purpose**: Public-facing user identifier
  - **Usage**: UI display, API filtering, relationships, creator tracking
  - **Format**: `USR-XXXX-XXXX`
  
- **`escra_private_user_id`**
  - **Type**: UUIDv7
  - **Purpose**: System/internal identifier
  - **Usage**: Backend operations
  - **Same as**: `id`
  
- **`tenant_id`** (User)
  - **Type**: String (references `escra_public_org_id`)
  - **Purpose**: Links user to organization
  - **Usage**: Filtering, relationships
  - **Note**: Contains public org ID, not private ID

---

## Contract IDs

### Contract Entity
- **`id`** (BaseEntity)
  - **Type**: UUIDv7
  - **Same as**: `escra_private_contract_id`
  
- **`escra_public_contract_id`**
  - **Type**: Formatted string (e.g., `CON-9D4Q`)
  - **Purpose**: Public-facing contract identifier
  - **Usage**: UI display, API filtering, relationships
  - **Format**: `CON-XXXX`
  
- **`escra_private_contract_id`**
  - **Type**: UUIDv7
  - **Purpose**: System/internal identifier
  - **Usage**: Backend operations
  - **Same as**: `id`
  
- **`on_chain_id`**
  - **Type**: Number (Algorand App ID)
  - **Purpose**: On-chain identifier
  - **Usage**: Blockchain operations
  
- **`tenant_id`** (Contract)
  - **Type**: String (references `escra_public_org_id`)
  - **Purpose**: Links contract to organization
  
- **`user_creator_id`** (Contract)
  - **Type**: String (references `escra_public_user_id`)
  - **Purpose**: Tracks creator of contract
  - **Usage**: Filtering, attribution

**Removed Fields**:
- ❌ **`contract_id`** - REMOVED (replaced by `escra_public_contract_id`)

---

## Document IDs

### Document Entity
- **`id`** (BaseEntity)
  - **Type**: UUIDv7
  - **Same as**: `escra_private_document_id`
  
- **`escra_public_document_id`**
  - **Type**: Formatted string (e.g., `DOC-T7QJ`)
  - **Purpose**: Public-facing document identifier
  - **Usage**: UI display, API filtering, relationships
  - **Format**: `DOC-XXXX`
  
- **`escra_private_document_id`**
  - **Type**: UUIDv7
  - **Purpose**: System/internal identifier
  - **Usage**: Backend operations
  - **Same as**: `id`
  
- **`on_chain_id`**
  - **Type**: Number (Algorand App ID)
  - **Purpose**: On-chain identifier
  
- **`tenant_id`** (Document)
  - **Type**: String (references `escra_public_org_id`)
  
- **`user_creator_id`** (Document)
  - **Type**: String (references `escra_public_user_id`)

**Removed Fields**:
- ❌ **`document_id`** - REMOVED (replaced by `escra_public_document_id`)

---

## Signature Request IDs

### SignatureRequest Entity
- **`id`** (BaseEntity)
  - **Type**: UUIDv7
  - **Same as**: `escra_private_signature_request_id`
  
- **`escra_public_signature_request_id`**
  - **Type**: Formatted string (e.g., `REQ-K4WN`)
  - **Purpose**: Public-facing signature request identifier
  - **Usage**: UI display, API filtering, relationships
  - **Format**: `REQ-XXXX`
  
- **`escra_private_signature_request_id`**
  - **Type**: UUIDv7
  - **Purpose**: System/internal identifier
  - **Usage**: Backend operations
  - **Same as**: `id`
  
- **`on_chain_id`**
  - **Type**: Number (Algorand App ID)
  
- **`tenant_id`** (SignatureRequest)
  - **Type**: String (references `escra_public_org_id`)
  
- **`user_creator_id`** (SignatureRequest)
  - **Type**: String (references `escra_public_user_id`)
  
- **`document_id`** (SignatureRequest)
  - **Type**: String (references `escra_public_document_id`)

**Removed Fields**:
- ❌ **`request_id`** - REMOVED (replaced by `escra_public_signature_request_id`)

---

## Key IDs

### Key Entity
- **`id`** (BaseEntity)
  - **Type**: UUIDv7
  - **Purpose**: System identifier
  
- **`key_id`**
  - **Type**: String (e.g., `signing-key-acme-001`)
  - **Purpose**: Human-readable key identifier
  - **Usage**: Display, logging
  
- **`tenant_id`** (Key)
  - **Type**: String (references `escra_public_org_id`)
  - **Purpose**: Links key to organization
  - **Usage**: Filtering, relationships
  
- **`user_id`** (Key)
  - **Type**: String (references `escra_public_user_id`)
  - **Purpose**: Links key to user
  - **Usage**: Filtering, relationships

**Removed Fields**:
- ❌ **`escra_user_id`** - REMOVED (was redundant, `user_id` already contains `escra_public_user_id`)

---

## Other Entity-Specific IDs

### Persona Verification (Identity / KYB-KYC)
- **`inquiry_id`**
  - **Type**: Formatted string (e.g., `INQ-D3KL`)
  - **Purpose**: Primary inquiry identifier
  - **Usage**: UI display (Identity page table & drawer), filtering, relationships
  - **Format**: `INQ-XXXX`
  
- **`tenant_id`**
  - **Type**: String (references `escra_public_org_id`)
  
- **`user_id`**
  - **Type**: String (references `escra_public_user_id`)

### Support Cases
- **`case_id`** - Formatted support case ID (e.g., `SUP-2024-001`)
- **`tenant_id`** - Optional, references `escra_public_org_id`
- **`user_id`** - Optional, references `escra_public_user_id`
- **`created_by`** - References `escra_public_user_id`

### Security Events
- **`event_id`** - Formatted event ID (e.g., `SEC-2024-001`)
- **`tenant_id`** - Optional, references `escra_public_org_id`
- **`user_id`** - Optional, references `escra_public_user_id`

### Indexer Jobs
- **`job_id`** - Formatted job ID (e.g., `index-2024-01-28-001`)

### Indexer Config
- **`config_id`** - Configuration identifier (e.g., `default`)

### Roles
- **`tenant_id`** - Optional, references `escra_public_org_id` (for tenant-scoped roles)

### UserSession
- **`user_id`** - References `escra_public_user_id`
- **`tenant_id`** - References `escra_public_org_id`

### SignatureEvent
- **`signature_id`** - Signature identifier
- **`contract_id`** - References `escra_public_contract_id`
- **`document_id`** - Optional, references `escra_public_document_id`
- **`tenant_id`** - References `escra_public_org_id`
- **`signer_user_id`** - Optional, references `escra_public_user_id`

### OnChainEvent
- **`tx_id`** - Transaction ID
- **`app_id`** - Algorand application ID (number)
- **`asset_id`** - Algorand asset ID (number)
- **`tenant_id`** - Optional, references `escra_public_org_id`
- **`contract_id`** - Optional, references `escra_public_contract_id`
- **`document_id`** - Optional, references `escra_public_document_id`
- **`workflow_id`** - Optional, workflow identifier

### ContractExecutionTrace
- **`execution_id`** - Execution identifier
- **`contract_id`** - References `escra_public_contract_id`
- **`tenant_id`** - References `escra_public_org_id`
- **`tx_id`** - Transaction ID
- **`app_id`** - Algorand application ID
- **`executed_by`** - Optional, references `escra_public_user_id`

### StateTransition
- **`transition_id`** - Transition identifier
- **`resource_id`** - Generic resource identifier
- **`tenant_id`** - References `escra_public_org_id`
- **`initiated_by`** - Optional, references `escra_public_user_id`

### ReconciliationStatus
- **`reconciliation_id`** - Reconciliation identifier
- **`resource_id`** - Generic resource identifier
- **`tenant_id`** - References `escra_public_org_id`

### Templates & Workflows
- **`template_id`** - Template identifier
- **`workflow_id`** - Workflow identifier
- **`step_id`** - Workflow step identifier
- **`tenant_id`** - Optional, references `escra_public_org_id`

### Billing & Usage
- **`metric_id`** - Metric identifier
- **`event_id`** - Billing event identifier
- **`tenant_id`** - References `escra_public_org_id`

### Abuse/Fraud Cases
- **`case_id`** - Case identifier
- **`tenant_id`** - Optional, references `escra_public_org_id`
- **`user_id`** - Optional, references `escra_public_user_id`

### ImpersonationSession
- **`session_id`** - Session identifier
- **`impersonator_id`** - References `escra_public_user_id`
- **`impersonated_user_id`** - References `escra_public_user_id`
- **`tenant_id`** - Optional, references `escra_public_org_id`

### Announcement
- **`announcement_id`** - Announcement identifier
- **`tenant_id`** - Optional, references `escra_public_org_id` (null = global)

### AccessReview
- **`review_id`** - Review identifier
- **`tenant_id`** - Optional, references `escra_public_org_id`
- **`reviewed_by`** - References `escra_public_user_id`
- **`user_id`** (in AccessReviewFinding) - Optional, references `escra_public_user_id`
- **`role_id`** (in AccessReviewFinding) - Optional, role identifier

---

## ID Field Usage Patterns

### Public IDs (Display & Relationships)
- `escra_public_org_id` - Used for:
  - UI display (tenant drawer, tables)
  - API filtering (`listUsers({ tenant_id })`)
  - Relationships (`user.tenant_id`, `key.tenant_id`, `contract.tenant_id`)
  - Hyperlinks to open tenant drawer

- `escra_public_user_id` - Used for:
  - UI display (user drawer, tables)
  - API filtering (`listKeys({ user_id })`)
  - Creator tracking (`contract.user_creator_id`, `document.user_creator_id`, `signature_request.user_creator_id`)
  - Relationships (`key.user_id`)

- `escra_public_contract_id` - Used for:
  - UI display (tables, drawers)
  - References in `ContractExecutionTrace`, `SignatureEvent`, `OnChainEvent`

- `escra_public_document_id` - Used for:
  - UI display (tables, drawers)
  - References in `SignatureRequest`, `SignatureEvent`, `OnChainEvent`

- `escra_public_signature_request_id` - Used for:
  - UI display (tables, drawers)
  - Format: `REQ-XXXX` (updated from `SIGR-XXXX`)

### Private IDs (Backend & System)
- `id` / `escra_private_org_id` / `escra_private_user_id` / `escra_private_contract_id` / `escra_private_document_id` / `escra_private_signature_request_id` - Used for:
  - Database primary keys
  - Backend API operations
  - Internal system references
  - Not displayed in UI (except in admin/system views)

---

## Cleanup Status

### ✅ Completed

1. **Removed `escra_user_id` from Key interface** ✅
   - **Location**: `frontend/src/types/index.ts`
   - **Reason**: Redundant - `user_id` already contains `escra_public_user_id`
   - **Status**: Completed
   - **Files updated**:
     - `frontend/src/types/index.ts` - Removed field
     - `frontend/src/lib/api-client.ts` - Removed from mock keys
     - `frontend/src/app/admin/tenants/page.tsx` - Removed from filtering
     - `frontend/src/app/admin/users/page.tsx` - Removed from filtering
     - `frontend/src/app/admin/keys/page.tsx` - Changed to display `user_id` instead

2. **Removed legacy `contract_id` from Contract interface** ✅
   - **Location**: `frontend/src/types/index.ts`
   - **Reason**: Replaced by `escra_public_contract_id`
   - **Status**: Completed
   - **Files updated**:
     - `frontend/src/types/index.ts` - Removed field
     - `frontend/src/lib/api-client.ts` - Removed from mock data
     - All UI components updated to use `escra_public_contract_id`

3. **Removed legacy `document_id` from Document interface** ✅
   - **Location**: `frontend/src/types/index.ts`
   - **Reason**: Replaced by `escra_public_document_id`
   - **Status**: Completed
   - **Files updated**:
     - `frontend/src/types/index.ts` - Removed field
     - `frontend/src/lib/api-client.ts` - Removed from mock data
     - All UI components updated to use `escra_public_document_id`

4. **Removed legacy `request_id` from SignatureRequest interface** ✅
   - **Location**: `frontend/src/types/index.ts`
   - **Reason**: Replaced by `escra_public_signature_request_id`
   - **Status**: Completed
   - **Files updated**:
     - `frontend/src/types/index.ts` - Removed field
     - `frontend/src/lib/api-client.ts` - Removed from mock data
     - All UI components updated to use `escra_public_signature_request_id`

5. **Updated signature request ID format** ✅
   - **Change**: From `SIGR-XXXX` to `REQ-XXXX`
   - **Status**: Completed
   - **Files updated**:
     - `frontend/src/lib/api-client.ts` - Updated `generatePublicSignatureRequestId` function
     - `frontend/src/types/index.ts` - Updated comment

### ⚠️ Known Redundancies (Kept by User Request)

*(None currently – all known redundant ID fields have been removed.)*

---

## ID Field Naming Conventions

### Current Patterns
- **Public IDs**: 
  - `escra_public_{org|user|contract|document|signature_request}_id`
  - Formats: 
    - `ORG-XXXX-XXXX` (organizations)
    - `USR-XXXX-XXXX` (users)
    - `CON-XXXX` (contracts)
    - `DOC-XXXX` (documents)
    - `REQ-XXXX` (signature requests)
    - `INQ-XXXX` (identity / verification inquiries, via `inquiry_id`)

- **Private IDs**: 
  - `escra_private_{org|user|contract|document|signature_request}_id` or `id` (UUIDv7)
  - All private IDs are UUIDv7 format

- **Relationship IDs**: 
  - `{entity}_id` (e.g., `tenant_id`, `user_id`) - Contains public IDs
  - `user_creator_id` - Contains `escra_public_user_id`
  - `document_id` (on SignatureRequest) - Contains `escra_public_document_id`
  - `contract_id` (on ContractExecutionTrace, SignatureEvent, OnChainEvent) - Contains `escra_public_contract_id`
  - `document_id` (on SignatureEvent, OnChainEvent) - Contains `escra_public_document_id`

### Recommendations
- ✅ Keep current pattern for public/private IDs
- ✅ Keep `tenant_id` and `user_id` in relationships (they contain public IDs)
- ✅ Keep `user_creator_id` for creator tracking
- ✅ Use consistent public/private ID pattern for all entities

---

## Files Using ID Fields

### Type Definitions
- `frontend/src/types/index.ts` - All interface definitions

### Mock Data
- `frontend/src/lib/api-client.ts` - All mock data generation

### Components
- `frontend/src/app/admin/tenants/page.tsx` - Tenant management
- `frontend/src/app/admin/users/page.tsx` - User management
- `frontend/src/app/admin/keys/page.tsx` - Key management
- `frontend/src/app/admin/indexer/page.tsx` - On-chain events & indexer
- Other admin pages (support, security, identity, etc.)

---

## Summary Statistics

- **Total ID fields**: ~60+ across all entities
- **Public ID fields**: 5 (`escra_public_org_id`, `escra_public_user_id`, `escra_public_contract_id`, `escra_public_document_id`, `escra_public_signature_request_id`)
- **Private ID fields**: 6 (`id`, `escra_private_org_id`, `escra_private_user_id`, `escra_private_contract_id`, `escra_private_document_id`, `escra_private_signature_request_id`)
- **Relationship ID fields**: ~25+ (`tenant_id`, `user_id`, `user_creator_id`, `document_id`, `contract_id`, etc.)
- **Formatted ID fields**: ~15+ (`case_id`, `event_id`, `job_id`, etc.)
- **Redundant fields removed**: 4 (`escra_user_id`, `contract_id`, `document_id`, `request_id`)
- **Redundant fields kept**: 0

---

## Duplication Analysis

### ✅ No Duplication Found

All ID fields serve distinct purposes:
- Public IDs are for display and relationships
- Private IDs are for backend/system operations
- Relationship IDs reference public IDs
- Formatted IDs are entity-specific identifiers

There are currently no known redundant ID fields; all ID fields serve a distinct purpose.

---

## Future Considerations

1. **Consistency**: All entities now follow the same public/private ID pattern
2. **Formatting**: All public IDs use consistent formatting (prefix + identifier)
3. **Relationships**: All relationship fields consistently reference public IDs
4. **Documentation**: This audit document should be updated whenever ID fields change
