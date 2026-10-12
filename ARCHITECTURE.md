# Escra Admin Portal - Architecture Overview

## Purpose

The **Escra Admin Portal** is a separate administrative application that provides management capabilities for data stored in the **Escra application's MongoDB database**. This admin portal does **not** have its own database - it connects to and works with the same database used by the production Escra application.

## Architecture Pattern

```
┌─────────────────────┐         ┌──────────────────────┐
│   Escra App         │         │  Escra Admin Portal  │
│  (Production App)   │         │   (This Codebase)    │
│                     │         │                      │
│  - User Interface   │         │  - Admin Interface   │
│  - Business Logic   │         │  - Admin APIs        │
│  - MongoDB Client   │         │  - MongoDB Client    │
└──────────┬──────────┘         └──────────┬───────────┘
           │                               │
           │                               │
           └───────────────┬───────────────┘
                           │
                           ▼
                 ┌──────────────────┐
                 │   MongoDB        │
                 │   (Shared DB)    │
                 │                  │
                 │  - tenants       │
                 │  - users         │
                 │  - keys          │
                 │  - contracts     │
                 │  - documents     │
                 │  - billing       │
                 │  - etc.          │
                 └──────────────────┘
```

## Key Principles

### 1. Shared Database

- **Both applications connect to the same MongoDB instance**
- The admin portal reads and writes to the Escra app's collections
- Data models must align between Escra app and admin portal
- Changes made in admin portal are immediately visible in Escra app (and vice versa)

### 2. Read-Write Access

The admin portal can:
- ✅ **Read** all data from Escra's database (tenants, users, keys, contracts, etc.)
- ✅ **Write/Update** specific administrative fields (status changes, flags, admin notes)
- ✅ **Create** administrative records (audit logs, admin users, support cases)
- ⚠️ **Careful with** core business data (should coordinate with Escra app team)

### 3. Data Model Alignment

The admin portal's Pydantic models should match the structure of data stored by the Escra app:
- Field names
- Data types
- Required vs optional fields
- Relationships (tenant_id, user_id, etc.)

### 4. Connection Configuration

Configure via environment variables:

```bash
# .env
MONGODB_URL=mongodb://user:pass@host:27017/escra?authSource=admin
MONGODB_DB_NAME=escra  # Should match Escra app's database name
```

**Important:** 
- `MONGODB_DB_NAME` should be set to the Escra app's actual database name
- Default is `"escra"` (assuming that's the Escra app's database name)
- In development, you might use `"escra_admin"` for testing, but production should point to the real Escra database

## Current Status

### ✅ Implemented (Ready for Escra DB)

- **Database Connection**: Configured to connect to MongoDB
- **Data Models**: Defined for tenants, users, keys, billing, security, support, audit
- **Repositories**: Tenant and User repositories implemented
- **API Endpoints**: Tenants, Users, Auth, Audit endpoints ready

### ⏳ Pending (Need Escra DB Schema Alignment)

Before connecting to production Escra database, we need to:

1. **Verify Data Models Match Escra App Schema**
   - Review Escra app's MongoDB collections
   - Ensure field names and types align
   - Validate relationships (foreign keys, references)

2. **Implement Remaining Repositories**
   - Keys, Billing, Security, Support repositories
   - Match Escra app's collection names and structures

3. **API Endpoints for Remaining Domains**
   - Keys & Vault API
   - Billing & Usage API
   - Security & Risk API
   - Support API

## Development Workflow

### Local Development (Testing)

For local development and testing, you can:

1. **Use a separate test database:**
   ```bash
   MONGODB_DB_NAME=escra_admin_test
   ```

2. **Seed test data** using the seed script:
   ```bash
   python -m scripts.seed_data
   ```

3. **Develop and test** admin features independently

### Production Deployment

When deploying to production:

1. **Point to Escra app's MongoDB:**
   ```bash
   MONGODB_URL=<escra-production-mongodb-url>
   MONGODB_DB_NAME=escra  # Escra app's actual database name
   ```

2. **Use secure credentials** (via Vault/AWS Secrets Manager)

3. **Coordinate with Escra app team** on:
   - Database access permissions
   - Which collections can be modified
   - Audit logging requirements
   - Rate limiting considerations

## Security Considerations

### Read-Only Collections

Some collections might be **read-only** from the admin portal:
- Contract transactions (immutable blockchain data)
- Document hashes (tamper-evident records)
- Identity verification records (source of truth)

### Admin-Only Collections

These collections are **admin portal specific**:
- `admin_users` - Admin portal user accounts
- `audit_logs` - Admin actions audit trail
- `support_cases` - Support ticket management
- `admin_settings` - Admin portal configuration

### Shared Collections (Read-Write)

The admin portal can modify these Escra app collections:
- `tenants` - Status, flags, metadata
- `users` - Status, roles, verification status
- `keys` - Status, lifecycle events
- `billing_config` - Plan tiers, usage limits
- `security_settings` - Risk flags, abuse cases

## Database Schema Expectations

Based on the models defined, the Escra app's MongoDB should have collections like:

- `tenants` - Organization/tenant records
- `users` - User accounts
- `keys` - Cryptographic keys (signing, wallet, etc.)
- `contracts` - Smart contract instances
- `documents` - Document records
- `billing_config` - Billing configurations
- `usage_metrics` - Usage tracking
- `security_events` - Security incidents
- `abuse_cases` - Abuse reports
- `fraud_cases` - Fraud investigations
- `support_cases` - Support tickets

**Note:** Collection names and field structures should be verified with the Escra app team before production deployment.

## Migration Path

1. **Phase 1: Model Alignment** (Current)
   - Define models matching Escra app's schema
   - Document expected collection structures

2. **Phase 2: Repository Implementation**
   - Implement repositories for all domains
   - Handle schema differences gracefully
   - Add migration/compatibility layers if needed

3. **Phase 3: API Implementation**
   - Build REST APIs for all domains
   - Implement proper error handling
   - Add validation and authorization

4. **Phase 4: Production Connection**
   - Test against Escra staging database
   - Verify read/write operations
   - Deploy to production

## Questions to Resolve with Escra App Team

1. What is the exact database name used by Escra app?
2. What are the exact collection names?
3. Are there any field name differences we should be aware of?
4. Which collections are read-only vs read-write?
5. What are the authentication/authorization requirements for database access?
6. Are there any indexes we should be aware of?
7. What are the data retention policies?
