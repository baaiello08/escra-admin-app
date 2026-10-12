# API Documentation

**Base URL:** `http://localhost:8000/api/v1`

**API Version:** v1

**Documentation Last Updated:** 2025-12-18

---

## Connection & Authentication

### Base URL Configuration

The API base URL can be configured via environment variable:
- **Development:** `http://localhost:8000/api/v1` (default)
- **Production:** Set `NEXT_PUBLIC_API_URL` environment variable

### Authentication

All endpoints require authentication via Bearer token in the `Authorization` header:
```
Authorization: Bearer <access_token>
```

Tokens are obtained via the `/auth/login` endpoint (see Authentication section below).

### Database Connection

**Important:** This admin portal connects to the **Escra App's MongoDB database** (shared database).

**Configuration:**
- **MongoDB URL:** Set via `MONGODB_URL` environment variable
  - Default: `mongodb://localhost:27017`
  - Production: Should point to Escra App's MongoDB instance
- **Database Name:** Set via `MONGODB_DB_NAME` environment variable
  - Default: `escra` (should match Escra App's database name)

**Data Sources:**
- **Contracts, Documents, Signature Requests/Events:** Read from Escra App database (shared MongoDB)
- **On-Chain Events:** Read from shared database (indexer writes, both admin and Escra app read)
- **Persona Inquiries:** Fetched from Persona API (third-party)
- **All other data:** Stored in shared MongoDB database

## Error Response Format

All errors follow a standardized format:

```json
{
  "error": {
    "message": "Resource not found (id: 123)",
    "code": "NOT_FOUND"
  }
}
```

For validation errors:
```json
{
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "errors": {
      "email": "Invalid email format",
      "tenant_id": "Invalid Tenant ID format: abc"
    }
  }
}
```

## Pagination

List endpoints support pagination using query parameters:
- `skip` (default: 0) - Number of items to skip
- `limit` (default: 100, max: 1000) - Number of items per page

Paginated responses include metadata:
```json
{
  "items": [...],
  "total": 150,
  "page": 1,
  "page_size": 100,
  "total_pages": 2
}
```

---

## Keys API

### List Keys
**GET** `/keys`

**Query Parameters:**
- `skip` (int, optional): Number of items to skip
- `limit` (int, optional): Number of items per page (max 1000)
- `tenant_id` (string, optional): Filter by tenant ID
- `user_id` (string, optional): Filter by user ID
- `key_type` (enum, optional): Filter by key type (`signing`, `wallet`, `api`, `encryption`)
- `status` (enum, optional): Filter by status (`active`, `inactive`, `revoked`, `rotated`, `pending`)

**Example Request:**
```bash
curl -X GET "http://localhost:8000/api/v1/keys?skip=0&limit=10&key_type=wallet&status=active" \
  -H "Authorization: Bearer <token>"
```

**Example Response:**
```json
{
  "items": [
    {
      "id": "507f1f77bcf86cd799439011",
      "user_id": "507f1f77bcf86cd799439012",
      "tenant_id": "507f1f77bcf86cd799439013",
      "key_type": "wallet",
      "status": "active",
      "public_key": "0x1234...",
      "key_fingerprint": "abc123",
      "algorithm": "ed25519",
      "vault_path": "secret/data/keys/507f1f77bcf86cd799439011",
      "last_used_at": "2025-01-27T10:00:00Z",
      "usage_count": 42,
      "created_at": "2025-01-20T08:00:00Z",
      "updated_at": "2025-01-27T10:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 10,
  "total_pages": 1
}
```

### Get Key by ID
**GET** `/keys/{key_id}`

**Example Request:**
```bash
curl -X GET "http://localhost:8000/api/v1/keys/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer <token>"
```

### Create Key
**POST** `/keys`

**Request Body:**
```json
{
  "user_id": "507f1f77bcf86cd799439012",
  "tenant_id": "507f1f77bcf86cd799439013",
  "key_type": "wallet",
  "status": "pending",
  "public_key": "0x1234...",
  "algorithm": "ed25519",
  "description": "Main wallet key"
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:8000/api/v1/keys" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "507f1f77bcf86cd799439012",
    "tenant_id": "507f1f77bcf86cd799439013",
    "key_type": "wallet",
    "status": "pending",
    "description": "Main wallet key"
  }'
```

**Example Response:** `201 Created`
```json
{
  "id": "507f1f77bcf86cd799439011",
  "user_id": "507f1f77bcf86cd799439012",
  "tenant_id": "507f1f77bcf86cd799439013",
  "key_type": "wallet",
  "status": "pending",
  "created_at": "2025-01-27T12:00:00Z",
  "updated_at": "2025-01-27T12:00:00Z"
}
```

### Update Key
**PATCH** `/keys/{key_id}`

**Request Body:**
```json
{
  "status": "active",
  "description": "Updated description"
}
```

**Example Request:**
```bash
curl -X PATCH "http://localhost:8000/api/v1/keys/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "active"
  }'
```

### Delete Key (Revoke)
**DELETE** `/keys/{key_id}`

**Example Request:**
```bash
curl -X DELETE "http://localhost:8000/api/v1/keys/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer <token>"
```

**Example Response:** `204 No Content`

---

## Support API

### List Support Cases
**GET** `/support/cases`

**Query Parameters:**
- `skip`, `limit` - Pagination
- `tenant_id` (string, optional)
- `user_id` (string, optional)
- `status` (enum, optional): `open`, `in_progress`, `resolved`, `closed`
- `priority` (enum, optional): `low`, `medium`, `high`, `urgent`
- `assigned_to` (string, optional)

**Example Request:**
```bash
curl -X GET "http://localhost:8000/api/v1/support/cases?status=open&priority=high" \
  -H "Authorization: Bearer <token>"
```

**Example Response:**
```json
{
  "items": [
    {
      "id": "507f1f77bcf86cd799439021",
      "tenant_id": "507f1f77bcf86cd799439013",
      "user_id": "507f1f77bcf86cd799439012",
      "title": "Unable to access wallet",
      "description": "User cannot access their wallet after update",
      "status": "open",
      "priority": "high",
      "assigned_to": "support@escra.io",
      "created_at": "2025-01-27T10:00:00Z",
      "updated_at": "2025-01-27T10:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 100,
  "total_pages": 1
}
```

### Create Support Case
**POST** `/support/cases`

**Request Body:**
```json
{
  "tenant_id": "507f1f77bcf86cd799439013",
  "user_id": "507f1f77bcf86cd799439012",
  "title": "Unable to access wallet",
  "description": "User cannot access their wallet after update",
  "priority": "high",
  "category": "technical"
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:8000/api/v1/support/cases" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "507f1f77bcf86cd799439013",
    "user_id": "507f1f77bcf86cd799439012",
    "title": "Unable to access wallet",
    "description": "User cannot access their wallet after update",
    "priority": "high"
  }'
```

### Update Support Case
**PATCH** `/support/cases/{case_id}`

**Request Body:**
```json
{
  "status": "in_progress",
  "assigned_to": "support@escra.io"
}
```

---

## Security API

### List Security Events
**GET** `/security/events`

**Query Parameters:**
- `skip`, `limit` - Pagination
- `tenant_id` (string, optional)
- `user_id` (string, optional)
- `event_type` (enum, optional): `login_failure`, `suspicious_activity`, `data_breach`, etc.
- `risk_level` (enum, optional): `low`, `medium`, `high`, `critical`
- `start_date` (datetime, optional)
- `end_date` (datetime, optional)

**Example Request:**
```bash
curl -X GET "http://localhost:8000/api/v1/security/events?risk_level=high&start_date=2025-01-01T00:00:00Z" \
  -H "Authorization: Bearer <token>"
```

**Example Response:**
```json
{
  "items": [
    {
      "id": "507f1f77bcf86cd799439031",
      "tenant_id": "507f1f77bcf86cd799439013",
      "user_id": "507f1f77bcf86cd799439012",
      "event_type": "suspicious_activity",
      "risk_level": "high",
      "description": "Multiple failed login attempts",
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0...",
      "metadata": {
        "attempts": 5,
        "time_window": "5 minutes"
      },
      "created_at": "2025-01-27T10:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 100,
  "total_pages": 1
}
```

### Create Security Event
**POST** `/security/events`

**Request Body:**
```json
{
  "tenant_id": "507f1f77bcf86cd799439013",
  "user_id": "507f1f77bcf86cd799439012",
  "event_type": "suspicious_activity",
  "risk_level": "high",
  "description": "Multiple failed login attempts",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "metadata": {
    "attempts": 5
  }
}
```

### Get Security Event
**GET** `/security/events/{event_id}`

### Update Security Event
**PATCH** `/security/events/{event_id}`

---

## Billing API

### Get Billing Configuration
**GET** `/billing/configs/{tenant_id}`

**Example Request:**
```bash
curl -X GET "http://localhost:8000/api/v1/billing/configs/507f1f77bcf86cd799439013" \
  -H "Authorization: Bearer <token>"
```

**Example Response:**
```json
{
  "id": "507f1f77bcf86cd799439041",
  "tenant_id": "507f1f77bcf86cd799439013",
  "plan_tier": "enterprise",
  "billing_cycle": "monthly",
  "payment_method": "credit_card",
  "auto_renew": true,
  "created_at": "2025-01-20T08:00:00Z",
  "updated_at": "2025-01-27T10:00:00Z"
}
```

### Create or Update Billing Configuration
**POST** `/billing/configs` or **PUT** `/billing/configs`

**Request Body:**
```json
{
  "tenant_id": "507f1f77bcf86cd799439013",
  "plan_tier": "enterprise",
  "billing_cycle": "monthly",
  "payment_method": "credit_card",
  "auto_renew": true
}
```

### List Usage Metrics
**GET** `/billing/usage`

**Query Parameters:**
- `skip`, `limit` - Pagination
- `tenant_id` (string, optional)
- `metric_type` (enum, optional): `api_calls`, `storage`, `transactions`, etc.
- `start_date` (datetime, optional)
- `end_date` (datetime, optional)

**Example Request:**
```bash
curl -X GET "http://localhost:8000/api/v1/billing/usage?tenant_id=507f1f77bcf86cd799439013&metric_type=api_calls&start_date=2025-01-01T00:00:00Z" \
  -H "Authorization: Bearer <token>"
```

### List Billing Events
**GET** `/billing/events`

**Query Parameters:**
- `skip`, `limit` - Pagination
- `tenant_id` (string, optional)
- `payment_status` (enum, optional): `pending`, `paid`, `failed`, `refunded`
- `start_date` (datetime, optional)
- `end_date` (datetime, optional)

### List Plan Tiers
**GET** `/billing/plans`

**Example Request:**
```bash
curl -X GET "http://localhost:8000/api/v1/billing/plans" \
  -H "Authorization: Bearer <token>"
```

**Example Response:**
```json
[
  {
    "tier": "starter",
    "name": "Starter Plan",
    "price": 29.99,
    "currency": "USD",
    "billing_cycle": "monthly",
    "features": {
      "api_calls": 10000,
      "storage_gb": 10,
      "users": 5
    }
  },
  {
    "tier": "enterprise",
    "name": "Enterprise Plan",
    "price": 299.99,
    "currency": "USD",
    "billing_cycle": "monthly",
    "features": {
      "api_calls": 1000000,
      "storage_gb": 1000,
      "users": -1
    }
  }
]
```

---

## Tenants API

### List Tenants
**GET** `/tenants`

**Query Parameters:**
- `skip` (int, optional): Number of items to skip (default: 0)
- `limit` (int, optional): Number of items per page (default: 100, max: 1000)
- `status` (string, optional): Filter by status

**Example Request:**
```bash
curl -X GET "http://localhost:8000/api/v1/tenants?skip=0&limit=10&status=active" \
  -H "Authorization: Bearer <token>"
```

**Example Response:**
```json
{
  "items": [
    {
      "id": "507f1f77bcf86cd799439013",
      "name": "TechCorp Solutions",
      "escra_public_org_id": "ORG-9T2Q-K3WN",
      "status": "active",
      "plan": "enterprise",
      "created_at": "2025-01-20T08:00:00Z",
      "updated_at": "2025-01-27T10:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 10,
  "total_pages": 1
}
```

### Get Tenant by ID
**GET** `/tenants/{tenant_id}`

**Example Request:**
```bash
curl -X GET "http://localhost:8000/api/v1/tenants/507f1f77bcf86cd799439013" \
  -H "Authorization: Bearer <token>"
```

### Create Tenant
**POST** `/tenants`

**Request Body:**
```json
{
  "name": "New Organization",
  "slug": "new-organization",
  "status": "active",
  "plan": "starter"
}
```

### Update Tenant
**PATCH** `/tenants/{tenant_id}`

**Request Body:**
```json
{
  "status": "suspended",
  "plan": "enterprise"
}
```

---

## Users API

### List Users
**GET** `/users`

**Query Parameters:**
- `skip` (int, optional): Number of items to skip (default: 0)
- `limit` (int, optional): Number of items per page (default: 100, max: 1000)
- `tenant_id` (string, optional): Filter by tenant ID (escra_public_org_id)
- `status` (string, optional): Filter by status
- `role` (string, optional): Filter by role
- `search` (string, optional): Search by name or email

**Example Request:**
```bash
curl -X GET "http://localhost:8000/api/v1/users?skip=0&limit=10&tenant_id=ORG-9T2Q-K3WN&status=active" \
  -H "Authorization: Bearer <token>"
```

**Example Response:**
```json
{
  "items": [
    {
      "id": "507f1f77bcf86cd799439012",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "escra_public_user_id": "USR-3PJ9-K2DT",
      "tenant_id": "ORG-9T2Q-K3WN",
      "status": "active",
      "roles": ["user"],
      "created_at": "2025-01-20T08:00:00Z",
      "updated_at": "2025-01-27T10:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 10,
  "total_pages": 1
}
```

### Get User by ID
**GET** `/users/{user_id}`

**Example Request:**
```bash
curl -X GET "http://localhost:8000/api/v1/users/507f1f77bcf86cd799439012" \
  -H "Authorization: Bearer <token>"
```

### Create User
**POST** `/users`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "secure_password",
  "first_name": "John",
  "last_name": "Doe",
  "tenant_id": "ORG-9T2Q-K3WN",
  "roles": ["user"]
}
```

**Error Response (409 Conflict) if email exists:**
```json
{
  "error": {
    "message": "User with this email already exists in tenant",
    "code": "DUPLICATE_EMAIL"
  }
}
```

### Update User
**PATCH** `/users/{user_id}`

**Request Body:**
```json
{
  "first_name": "Jane",
  "status": "active"
}
```

### Delete User
**DELETE** `/users/{user_id}`

**Example Request:**
```bash
curl -X DELETE "http://localhost:8000/api/v1/users/507f1f77bcf86cd799439012" \
  -H "Authorization: Bearer <token>"
```

**Example Response:** `204 No Content`

---

## Contracts API

**Data Source:** Reads from Escra App database (`contracts` collection)

### List Contracts
**GET** `/contracts`

**Query Parameters:**
- `skip` (int, optional): Number of items to skip (default: 0)
- `limit` (int, optional): Number of items per page (default: 100, max: 1000)
- `tenant_id` (string, optional): Filter by tenant ID (escra_public_org_id)
- `user_creator_id` (string, optional): Filter by user creator ID (escra_public_user_id)
- `status` (enum, optional): Filter by status (`draft`, `active`, `completed`, `cancelled`, `expired`)

**Example Request:**
```bash
curl -X GET "http://localhost:8000/api/v1/contracts?skip=0&limit=10&tenant_id=ORG-9T2Q-K3WN&status=active" \
  -H "Authorization: Bearer <token>"
```

**Example Response:**
```json
{
  "items": [
    {
      "id": "507f1f77bcf86cd799439051",
      "escra_public_contract_id": "CON-9D4Q",
      "escra_private_contract_id": "550e8400-e29b-41d4-a716-446655440000",
      "on_chain_id": 12345,
      "tenant_id": "ORG-9T2Q-K3WN",
      "user_creator_id": "USR-3PJ9-K2DT",
      "status": "active",
      "collaborator_count": 3,
      "document_count": 5,
      "transaction_count": 12,
      "lockup": 100.5,
      "transaction_cost": 0.001,
      "created_date": "2025-01-20T08:00:00Z",
      "last_update": "2025-01-27T10:00:00Z",
      "created_at": "2025-01-20T08:00:00Z",
      "updated_at": "2025-01-27T10:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 10,
  "total_pages": 1
}
```

### Get Contract by ID
**GET** `/contracts/{contract_id}`

**Note:** `contract_id` should be the `escra_public_contract_id` (e.g., `CON-9D4Q`)

**Example Request:**
```bash
curl -X GET "http://localhost:8000/api/v1/contracts/CON-9D4Q" \
  -H "Authorization: Bearer <token>"
```

---

## Documents API

**Data Source:** Reads from Escra App database (`documents` collection)

### List Documents
**GET** `/documents`

**Query Parameters:**
- `skip` (int, optional): Number of items to skip (default: 0)
- `limit` (int, optional): Number of items per page (default: 100, max: 1000)
- `tenant_id` (string, optional): Filter by tenant ID (escra_public_org_id)
- `user_creator_id` (string, optional): Filter by user creator ID (escra_public_user_id)
- `status` (enum, optional): Filter by status (`draft`, `active`, `signed`, `archived`, `deleted`)

**Example Request:**
```bash
curl -X GET "http://localhost:8000/api/v1/documents?skip=0&limit=10&tenant_id=ORG-9T2Q-K3WN" \
  -H "Authorization: Bearer <token>"
```

**Example Response:**
```json
{
  "items": [
    {
      "id": "507f1f77bcf86cd799439061",
      "escra_public_document_id": "DOC-T7QJ",
      "escra_private_document_id": "550e8400-e29b-41d4-a716-446655440001",
      "on_chain_id": 12346,
      "tenant_id": "ORG-9T2Q-K3WN",
      "user_creator_id": "USR-3PJ9-K2DT",
      "status": "active",
      "file_type": "application/pdf",
      "file_size": 1048576,
      "transaction_count": 3,
      "lockup": 50.0,
      "transaction_cost": 0.0005,
      "created_date": "2025-01-20T08:00:00Z",
      "last_update": "2025-01-27T10:00:00Z",
      "created_at": "2025-01-20T08:00:00Z",
      "updated_at": "2025-01-27T10:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 10,
  "total_pages": 1
}
```

### Get Document by ID
**GET** `/documents/{document_id}`

**Note:** `document_id` should be the `escra_public_document_id` (e.g., `DOC-T7QJ`)

**Example Request:**
```bash
curl -X GET "http://localhost:8000/api/v1/documents/DOC-T7QJ" \
  -H "Authorization: Bearer <token>"
```

---

## Signatures API

**Data Source:** Reads from Escra App database (`signature_requests` and `signature_events` collections)

### List Signature Requests
**GET** `/signatures/requests`

**Query Parameters:**
- `skip` (int, optional): Number of items to skip (default: 0)
- `limit` (int, optional): Number of items per page (default: 100, max: 1000)
- `tenant_id` (string, optional): Filter by tenant ID (escra_public_org_id)
- `document_id` (string, optional): Filter by document ID (escra_public_document_id)
- `user_creator_id` (string, optional): Filter by user creator ID (escra_public_user_id)
- `status` (enum, optional): Filter by status (`pending`, `in_progress`, `completed`, `cancelled`, `expired`)

**Example Request:**
```bash
curl -X GET "http://localhost:8000/api/v1/signatures/requests?skip=0&limit=10&status=pending" \
  -H "Authorization: Bearer <token>"
```

**Example Response:**
```json
{
  "items": [
    {
      "id": "507f1f77bcf86cd799439071",
      "escra_public_signature_request_id": "REQ-K4WN",
      "escra_private_signature_request_id": "550e8400-e29b-41d4-a716-446655440002",
      "on_chain_id": 12347,
      "tenant_id": "ORG-9T2Q-K3WN",
      "document_id": "DOC-T7QJ",
      "user_creator_id": "USR-3PJ9-K2DT",
      "status": "pending",
      "signer_count": 3,
      "signed_count": 0,
      "required_signers": [
        {
          "user_id": "USR-3PJ9-K2DT",
          "address": "ALGO_ADDRESS_1",
          "name": "John Doe"
        }
      ],
      "transaction_count": 0,
      "transaction_cost": 0.0,
      "created_date": "2025-01-20T08:00:00Z",
      "last_update": "2025-01-27T10:00:00Z",
      "created_at": "2025-01-20T08:00:00Z",
      "updated_at": "2025-01-27T10:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 10,
  "total_pages": 1
}
```

### Get Signature Request by ID
**GET** `/signatures/requests/{request_id}`

**Note:** `request_id` should be the `escra_public_signature_request_id` (e.g., `REQ-K4WN`)

**Example Request:**
```bash
curl -X GET "http://localhost:8000/api/v1/signatures/requests/REQ-K4WN" \
  -H "Authorization: Bearer <token>"
```

### List Signature Events
**GET** `/signatures/events`

**Query Parameters:**
- `skip` (int, optional): Number of items to skip (default: 0)
- `limit` (int, optional): Number of items per page (default: 100, max: 1000)
- `tenant_id` (string, optional): Filter by tenant ID (escra_public_org_id)
- `document_id` (string, optional): Filter by document ID (escra_public_document_id)
- `signature_request_id` (string, optional): Filter by signature request ID (escra_public_signature_request_id)
- `user_id` (string, optional): Filter by user ID (escra_public_user_id)

**Example Request:**
```bash
curl -X GET "http://localhost:8000/api/v1/signatures/events?skip=0&limit=10&user_id=USR-3PJ9-K2DT" \
  -H "Authorization: Bearer <token>"
```

**Example Response:**
```json
{
  "items": [
    {
      "id": "507f1f77bcf86cd799439081",
      "escra_public_signature_id": "SIG-XXXX",
      "escra_private_signature_id": "550e8400-e29b-41d4-a716-446655440003",
      "signature_request_id": "REQ-K4WN",
      "document_id": "DOC-T7QJ",
      "tenant_id": "ORG-9T2Q-K3WN",
      "user_id": "USR-3PJ9-K2DT",
      "on_chain_id": 12348,
      "tx_id": "ALGO_TX_ID",
      "block": 123456,
      "round": 123456,
      "signature_data": {},
      "signed_at": "2025-01-27T10:00:00Z",
      "created_date": "2025-01-27T10:00:00Z",
      "last_update": "2025-01-27T10:00:00Z",
      "created_at": "2025-01-27T10:00:00Z",
      "updated_at": "2025-01-27T10:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 10,
  "total_pages": 1
}
```

### Get Signature Event by ID
**GET** `/signatures/events/{event_id}`

**Note:** `event_id` should be the `escra_public_signature_id` (e.g., `SIG-XXXX`)

**Example Request:**
```bash
curl -X GET "http://localhost:8000/api/v1/signatures/events/SIG-XXXX" \
  -H "Authorization: Bearer <token>"
```

---

## Indexer API

**Data Source:** 
- On-chain events: Reads from shared database (`on_chain_events` collection) - indexer writes, both admin and Escra app read
- Indexer jobs: Reads from shared database (`indexer_job_runs` collection)
- Indexer status/config: Reads from shared database (`indexer_configurations` collection)

### Get Indexer Status
**GET** `/indexer/status`

**Example Request:**
```bash
curl -X GET "http://localhost:8000/api/v1/indexer/status" \
  -H "Authorization: Bearer <token>"
```

**Example Response:**
```json
{
  "config": {
    "enabled": true,
    "poll_interval_seconds": 5,
    "batch_size": 100,
    "max_lag_blocks": 100
  },
  "current_round": 123456,
  "latest_indexed_round": 123450,
  "lag_blocks": 6,
  "is_healthy": true,
  "recent_jobs": [],
  "error_count": 0,
  "running": true
}
```

### Get Indexer Configuration
**GET** `/indexer/config`

**Example Request:**
```bash
curl -X GET "http://localhost:8000/api/v1/indexer/config" \
  -H "Authorization: Bearer <token>"
```

### Update Indexer Configuration
**PATCH** `/indexer/config`

**Request Body:**
```json
{
  "enabled": true,
  "poll_interval_seconds": 10,
  "batch_size": 200,
  "max_lag_blocks": 150
}
```

### Start Indexer
**POST** `/indexer/start`

Starts the indexer polling process in the background.

**Example Request:**
```bash
curl -X POST "http://localhost:8000/api/v1/indexer/start" \
  -H "Authorization: Bearer <token>"
```

**Example Response:**
```json
{
  "status": "started",
  "message": "Indexer polling started in background"
}
```

### Stop Indexer
**POST** `/indexer/stop`

Stops the indexer polling process.

**Example Request:**
```bash
curl -X POST "http://localhost:8000/api/v1/indexer/stop" \
  -H "Authorization: Bearer <token>"
```

**Example Response:**
```json
{
  "status": "stopped",
  "message": "Indexer polling stopped"
}
```

### Backfill Indexer
**POST** `/indexer/backfill`

Triggers a backfill operation to index historical transactions.

**Request Body:**
```json
{
  "min_round": 100000,
  "max_round": 120000,
  "app_ids": [12345, 67890]
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:8000/api/v1/indexer/backfill" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "min_round": 100000,
    "max_round": 120000
  }'
```

**Example Response:**
```json
{
  "status": "started",
  "message": "Backfill operation started in background",
  "min_round": 100000,
  "max_round": 120000
}
```

### Index Now (Synchronous)
**POST** `/indexer/index-now`

Triggers an immediate indexing run (synchronous).

**Query Parameters:**
- `min_round` (int, optional)
- `max_round` (int, optional)
- `app_ids` (list[int], optional)

**Example Request:**
```bash
curl -X POST "http://localhost:8000/api/v1/indexer/index-now?min_round=123000&max_round=123100" \
  -H "Authorization: Bearer <token>"
```

### List On-Chain Events
**GET** `/indexer/events`

**Query Parameters:**
- `skip` (int, optional): Number of items to skip (default: 0)
- `limit` (int, optional): Number of items per page (default: 100, max: 1000)
- `tenant_id` (string, optional): Filter by tenant ID (escra_public_org_id)
- `contract_id` (string, optional): Filter by contract ID (escra_public_contract_id)
- `document_id` (string, optional): Filter by document ID (escra_public_document_id)
- `event_type` (enum, optional): Filter by event type (see EventType enum)
- `app_id` (int, optional): Filter by Algorand App ID

**Example Request:**
```bash
curl -X GET "http://localhost:8000/api/v1/indexer/events?skip=0&limit=20&event_type=signature_event&tenant_id=ORG-9T2Q-K3WN" \
  -H "Authorization: Bearer <token>"
```

**Example Response:**
```json
{
  "items": [
    {
      "id": "507f1f77bcf86cd799439091",
      "tx_id": "ALGO_TX_ID_123",
      "block": 123456,
      "round": 123456,
      "timestamp": "2025-01-27T10:00:00Z",
      "event_type": "signature_event",
      "app_id": 12345,
      "sender": "ALGO_ADDRESS_1",
      "receiver": "ALGO_ADDRESS_2",
      "amount": 1000000,
      "tenant_id": "ORG-9T2Q-K3WN",
      "contract_id": "CON-9D4Q",
      "document_id": "DOC-T7QJ",
      "raw_tx_data": {},
      "indexed_at": "2025-01-27T10:00:05Z",
      "indexer_version": "0.1.0",
      "created_at": "2025-01-27T10:00:05Z",
      "updated_at": "2025-01-27T10:00:05Z"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 20,
  "total_pages": 1
}
```

**Event Types:**
- `transaction` - Generic transaction
- `application_call` - Application call transaction
- `asset_transfer` - Asset transfer transaction
- `contract_execution` - Contract execution
- `signature_event` - Signature event
- `state_transition` - State transition

### List Indexer Jobs
**GET** `/indexer/jobs`

**Query Parameters:**
- `skip` (int, optional): Number of items to skip (default: 0)
- `limit` (int, optional): Number of items per page (default: 100, max: 1000)

**Example Request:**
```bash
curl -X GET "http://localhost:8000/api/v1/indexer/jobs?skip=0&limit=10" \
  -H "Authorization: Bearer <token>"
```

**Example Response:**
```json
{
  "items": [
    {
      "id": "507f1f77bcf86cd799439101",
      "job_id": "index_2025-01-27T10:00:00",
      "job_type": "poll",
      "status": "completed",
      "start_round": 123000,
      "end_round": 123100,
      "events_processed": 500,
      "events_indexed": 495,
      "errors_count": 5,
      "rounds_processed": 101,
      "started_at": "2025-01-27T10:00:00Z",
      "completed_at": "2025-01-27T10:05:00Z",
      "duration_seconds": 300,
      "created_at": "2025-01-27T10:00:00Z",
      "updated_at": "2025-01-27T10:05:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 10,
  "total_pages": 1
}
```

---

## Persona API

**Data Source:** Fetches from Persona API (third-party service)

### List Persona Inquiries
**GET** `/persona/inquiries`

**Query Parameters:**
- `limit` (int, optional): Number of items per page (default: 20)
- `offset` (int, optional): Number of items to skip (default: 0)
- `filter_status` (string, optional): Filter by status

**Example Request:**
```bash
curl -X GET "http://localhost:8000/api/v1/persona/inquiries?limit=20&offset=0&filter_status=completed" \
  -H "Authorization: Bearer <token>"
```

**Example Response:**
```json
{
  "data": [
    {
      "id": "inq_123456",
      "type": "inquiry",
      "attributes": {
        "status": "completed",
        "created_at": "2025-01-20T08:00:00Z"
      }
    }
  ],
  "meta": {
    "page": {
      "number": 1,
      "size": 20
    }
  }
}
```

**Note:** Response format follows Persona API's structure. The exact format may vary based on Persona API version.

### Get Persona Inquiry
**GET** `/persona/inquiries/{inquiry_id}`

**Example Request:**
```bash
curl -X GET "http://localhost:8000/api/v1/persona/inquiries/inq_123456" \
  -H "Authorization: Bearer <token>"
```

### Create Persona Inquiry
**POST** `/persona/inquiries`

**Request Body:**
```json
{
  "template_id": "tmpl_123",
  "reference_id": "ref_456",
  "fields": {
    "name-first": "John",
    "name-last": "Doe"
  }
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:8000/api/v1/persona/inquiries" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": "tmpl_123",
    "reference_id": "ref_456"
  }'
```

### Persona Webhook
**POST** `/persona/webhooks`

Receives webhook events from Persona for verification status updates.

**Headers:**
- `X-Persona-Signature` (required): Webhook signature for verification

**Note:** This endpoint is called by Persona, not by the admin portal directly.

---

## Audit API

### List Audit Logs
**GET** `/audit`

**Query Parameters:**
- `skip` (int, optional): Number of items to skip (default: 0)
- `limit` (int, optional): Number of items per page (default: 100, max: 1000)
- `tenant_id` (string, optional): Filter by tenant ID
- `user_id` (string, optional): Filter by user ID
- `action_type` (enum, optional): Filter by action type
- `start_date` (datetime, optional): Filter by start date
- `end_date` (datetime, optional): Filter by end date

**Example Request:**
```bash
curl -X GET "http://localhost:8000/api/v1/audit?skip=0&limit=10&action_type=create&start_date=2025-01-01T00:00:00Z" \
  -H "Authorization: Bearer <token>"
```

**Example Response:**
```json
[
  {
    "id": "507f1f77bcf86cd799439111",
    "tenant_id": "507f1f77bcf86cd799439013",
    "user_id": "507f1f77bcf86cd799439012",
    "action_type": "create",
    "resource_type": "user",
    "resource_id": "507f1f77bcf86cd799439014",
    "description": "User created",
    "ip_address": "192.168.1.100",
    "user_agent": "Mozilla/5.0...",
    "metadata": {},
    "created_at": "2025-01-27T10:00:00Z"
  }
]
```

**Note:** Audit logs are read-only (append-only pattern). They cannot be modified or deleted.

### Get Audit Log by ID
**GET** `/audit/{log_id}`

**Example Request:**
```bash
curl -X GET "http://localhost:8000/api/v1/audit/507f1f77bcf86cd799439111" \
  -H "Authorization: Bearer <token>"
```

---

## Health API

### Health Check
**GET** `/health`

**Example Request:**
```bash
curl -X GET "http://localhost:8000/health"
```

**Example Response:**
```json
{
  "status": "healthy",
  "service": "escra-admin-api"
}
```

**Note:** This endpoint does not require authentication.

### Readiness Check
**GET** `/ready`

Checks database connectivity.

**Example Request:**
```bash
curl -X GET "http://localhost:8000/ready"
```

**Example Response:**
```json
{
  "status": "ready",
  "service": "escra-admin-api"
}
```

**Note:** This endpoint does not require authentication.

---

## Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `NOT_FOUND` | Resource not found | 404 |
| `VALIDATION_ERROR` | Input validation failed | 422 |
| `CONFLICT` | Resource conflict (e.g., duplicate) | 409 |
| `UNAUTHORIZED` | Authentication required | 401 |
| `FORBIDDEN` | Insufficient permissions | 403 |
| `DUPLICATE_EMAIL` | Email already exists | 409 |
| `INVALID_ID` | Invalid ObjectId format | 422 |

---

## Authentication

### Login
**POST** `/auth/login`

**Request Body:**
```json
{
  "email": "admin@escra.io",
  "password": "admin123",
  "tenant_id": "optional_tenant_id"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user_id": "507f1f77bcf86cd799439012",
  "tenant_id": "507f1f77bcf86cd799439013",
  "roles": ["super_admin"],
  "permissions": []
}
```

### Refresh Token
**POST** `/auth/refresh`

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## Data Source Reference

### Escra App Database (Shared MongoDB)
These endpoints read from the Escra App's MongoDB database:
- **Contracts API** - `contracts` collection
- **Documents API** - `documents` collection
- **Signatures API** - `signature_requests` and `signature_events` collections
- **Tenants API** - `tenants` collection
- **Users API** - `users` collection
- **Keys API** - `keys` collection
- **Billing API** - `billing_config`, `usage_metrics`, `billing_events`, `plan_tiers` collections
- **Security API** - `security_settings`, `security_events`, `abuse_cases`, `fraud_cases` collections
- **Support API** - `support_cases`, `impersonation_sessions`, `announcements` collections
- **Audit API** - `audit_logs` collection

### Shared Database (Indexer Writes, Both Read)
These endpoints read from the shared database where the indexer stores data:
- **Indexer Events API** - `on_chain_events` collection (indexer writes, both admin and Escra app read)
- **Indexer Jobs API** - `indexer_job_runs` collection
- **Indexer Config API** - `indexer_configurations` collection

### Third-Party APIs
- **Persona API** - Fetches directly from Persona API (third-party service)

---

## ID Format Reference

### Public IDs (Used in API)
- **Tenant ID:** `ORG-XXXX-XXXX` (e.g., `ORG-9T2Q-K3WN`)
- **User ID:** `USR-XXXX-XXXX` (e.g., `USR-3PJ9-K2DT`)
- **Contract ID:** `CON-XXXX` (e.g., `CON-9D4Q`)
- **Document ID:** `DOC-XXXX` (e.g., `DOC-T7QJ`)
- **Signature Request ID:** `REQ-XXXX` (e.g., `REQ-K4WN`)
- **Signature ID:** `SIG-XXXX` (e.g., `SIG-XXXX`)

### Private IDs (MongoDB ObjectIds)
- All entities also have a private `id` field which is a MongoDB ObjectId (24-character hex string)
- Private IDs are used internally and in some API responses

**Note:** When filtering or querying by ID in the API, use the **public ID** format (e.g., `ORG-9T2Q-K3WN`, not the MongoDB ObjectId).

---

## Notes

- All timestamps are in ISO 8601 format (UTC)
- All IDs in API responses are MongoDB ObjectIds (24-character hex strings) for the `id` field
- Public IDs (e.g., `ORG-XXXX-XXXX`) are used for filtering and relationships
- Pagination uses `skip`/`limit` internally but responses include `page`/`page_size` for frontend convenience
- All endpoints require appropriate permissions (see RBAC documentation)
- Invalid ObjectId formats will return `422 Validation Error` with details
- The admin portal connects to the Escra App's MongoDB database (shared database)
- Contracts, Documents, and Signatures are read-only from the admin portal (managed by Escra App)
- On-chain events are written by the indexer service and read by both admin portal and Escra app
- Persona inquiries are fetched from Persona API in real-time

---

## API Endpoint Summary

### Authentication
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token
- `POST /api/v1/auth/logout` - Logout
- `GET /api/v1/auth/me` - Get current user

### Tenants
- `GET /api/v1/tenants` - List tenants (paginated)
- `GET /api/v1/tenants/{tenant_id}` - Get tenant
- `POST /api/v1/tenants` - Create tenant
- `PATCH /api/v1/tenants/{tenant_id}` - Update tenant

### Users
- `GET /api/v1/users` - List users (paginated)
- `GET /api/v1/users/{user_id}` - Get user
- `POST /api/v1/users` - Create user
- `PATCH /api/v1/users/{user_id}` - Update user
- `DELETE /api/v1/users/{user_id}` - Delete user

### Contracts
- `GET /api/v1/contracts` - List contracts (paginated)
- `GET /api/v1/contracts/{contract_id}` - Get contract

### Documents
- `GET /api/v1/documents` - List documents (paginated)
- `GET /api/v1/documents/{document_id}` - Get document

### Signatures
- `GET /api/v1/signatures/requests` - List signature requests (paginated)
- `GET /api/v1/signatures/requests/{request_id}` - Get signature request
- `GET /api/v1/signatures/events` - List signature events (paginated)
- `GET /api/v1/signatures/events/{event_id}` - Get signature event

### Indexer
- `GET /api/v1/indexer/status` - Get indexer status
- `GET /api/v1/indexer/config` - Get indexer configuration
- `PATCH /api/v1/indexer/config` - Update indexer configuration
- `POST /api/v1/indexer/start` - Start indexer
- `POST /api/v1/indexer/stop` - Stop indexer
- `POST /api/v1/indexer/backfill` - Backfill indexer
- `POST /api/v1/indexer/index-now` - Index now (synchronous)
- `GET /api/v1/indexer/events` - List on-chain events (paginated)
- `GET /api/v1/indexer/jobs` - List indexer jobs (paginated)

### Persona
- `GET /api/v1/persona/inquiries` - List Persona inquiries
- `GET /api/v1/persona/inquiries/{inquiry_id}` - Get Persona inquiry
- `POST /api/v1/persona/inquiries` - Create Persona inquiry
- `POST /api/v1/persona/webhooks` - Persona webhook endpoint

### Keys
- `GET /api/v1/keys` - List keys (paginated)
- `GET /api/v1/keys/{key_id}` - Get key
- `POST /api/v1/keys` - Create key
- `PATCH /api/v1/keys/{key_id}` - Update key
- `DELETE /api/v1/keys/{key_id}` - Delete key

### Billing
- `GET /api/v1/billing/configs/{tenant_id}` - Get billing config
- `POST /api/v1/billing/configs` - Create billing config
- `PUT /api/v1/billing/configs` - Update billing config
- `GET /api/v1/billing/usage` - List usage metrics
- `POST /api/v1/billing/usage` - Create usage metric
- `GET /api/v1/billing/events` - List billing events
- `POST /api/v1/billing/events` - Create billing event
- `GET /api/v1/billing/plans` - List plan tiers

### Security
- `GET /api/v1/security/settings` - Get security settings
- `POST /api/v1/security/settings` - Create security settings
- `PUT /api/v1/security/settings` - Update security settings
- `GET /api/v1/security/events` - List security events (paginated)
- `POST /api/v1/security/events` - Create security event
- `GET /api/v1/security/events/{event_id}` - Get security event
- `PATCH /api/v1/security/events/{event_id}` - Update security event
- `GET /api/v1/security/abuse-cases` - List abuse cases
- `POST /api/v1/security/abuse-cases` - Create abuse case
- `GET /api/v1/security/abuse-cases/{case_id}` - Get abuse case
- `PATCH /api/v1/security/abuse-cases/{case_id}` - Update abuse case
- `GET /api/v1/security/fraud-cases` - List fraud cases
- `POST /api/v1/security/fraud-cases` - Create fraud case
- `GET /api/v1/security/fraud-cases/{case_id}` - Get fraud case
- `PATCH /api/v1/security/fraud-cases/{case_id}` - Update fraud case

### Support
- `GET /api/v1/support/cases` - List support cases (paginated)
- `POST /api/v1/support/cases` - Create support case
- `GET /api/v1/support/cases/{case_id}` - Get support case
- `PATCH /api/v1/support/cases/{case_id}` - Update support case
- `GET /api/v1/support/impersonations` - List impersonation sessions
- `POST /api/v1/support/impersonations` - Create impersonation session
- `GET /api/v1/support/impersonations/{session_id}` - Get impersonation session
- `PATCH /api/v1/support/impersonations/{session_id}` - Update impersonation session
- `GET /api/v1/support/announcements` - List announcements
- `POST /api/v1/support/announcements` - Create announcement
- `GET /api/v1/support/announcements/{announcement_id}` - Get announcement
- `PATCH /api/v1/support/announcements/{announcement_id}` - Update announcement

### Audit
- `GET /api/v1/audit` - List audit logs
- `GET /api/v1/audit/{log_id}` - Get audit log

### Health
- `GET /health` - Health check (no auth required)
- `GET /ready` - Readiness check (no auth required)

---

## Rate Limiting

Currently, there are no rate limits implemented. In production, consider implementing rate limiting based on:
- User role
- Endpoint type
- Request frequency

---

## CORS Configuration

CORS is configured to allow requests from:
- `http://localhost:3000` (default frontend dev server)
- `http://localhost:3001` (alternative frontend dev server)

For production, update `CORS_ORIGINS` environment variable with allowed origins.

---

## OpenAPI Documentation

Interactive API documentation is available at:
- **Swagger UI:** `http://localhost:8000/api/docs` (development only)
- **ReDoc:** `http://localhost:8000/api/redoc` (development only)
- **OpenAPI JSON:** `http://localhost:8000/api/openapi.json` (development only)

**Note:** API documentation endpoints are disabled in production for security.

