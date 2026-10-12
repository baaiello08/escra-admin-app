# Escra Admin Portal

Production-grade, SOC2-aligned admin portal for Escra platform with Persona identity verification management and Escra Indexer subsystem.

## Architecture

- **Backend**: Python FastAPI with MongoDB
- **Frontend**: Next.js + React + TypeScript
- **Database**: MongoDB (connects to Escra app's shared database)
- **Indexer**: Escra Indexer subsystem for Algorand transaction ingestion
- **Identity**: Persona integration for identity verification

**Important:** This admin portal connects to the **Escra application's MongoDB database**. It reads from and writes to the same database used by the production Escra app. See `ARCHITECTURE.md` for detailed architecture documentation.

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for frontend development)
- Python 3.11+ (for backend development)
- Poetry (for Python dependency management)

### Environment Setup

1. Copy environment file templates:

```bash
cp .env.local.example .env.local
```

2. Edit `.env.local` and fill in your values:
   - MongoDB credentials
   - Persona API keys
   - Algorand configuration
   - Secret keys

### Running with Docker Compose

```bash
# Start all services
make up

# View logs
make logs

# Stop services
make down
```

Services will be available at:
- Backend API: http://localhost:8000
- Frontend: http://localhost:3000 (when running `npm run dev` in frontend/)
- MongoDB: localhost:27017

### Backend Development

```bash
cd backend

# Install dependencies with Poetry
poetry install

# Run development server
poetry run uvicorn app.main:app --reload

# Run tests
poetry run pytest
```

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

## Project Structure

```
escra_admin/
├── backend/              # Python FastAPI backend
│   ├── app/
│   │   ├── api/         # REST API routers
│   │   ├── core/        # Core infrastructure (config, security, logging)
│   │   ├── indexer/     # Escra Indexer subsystem
│   │   ├── models/      # Domain models and schemas
│   │   ├── repositories/# Data access layer
│   │   └── services/    # Business logic layer
│   └── Dockerfile
├── frontend/            # Next.js frontend
│   └── src/
│       ├── app/         # Next.js app router
│       ├── components/  # React components
│       └── lib/         # Utilities
├── docker-compose.yaml
└── Makefile
```

## Key Features

### Escra Indexer Subsystem

The Escra Indexer ingests Algorand transactions and state changes into MongoDB. The consumer app reads only from indexed data, not directly from Algorand.

- **MongoDB Collections**:
  - `on_chain_events` - Indexed Algorand transactions
  - `contract_execution_traces` - Contract execution logs
  - `signature_events` - Signature events
  - `state_transitions` - State machine transitions
  - `reconciliation_status` - On-chain vs off-chain consistency

- **API Endpoints**:
  - `GET /api/v1/indexer/status` - Get indexer status and health
  - `GET /api/v1/indexer/config` - Get configuration
  - `PATCH /api/v1/indexer/config` - Update configuration
  - `POST /api/v1/indexer/start` - Start indexing
  - `POST /api/v1/indexer/stop` - Stop indexing
  - `POST /api/v1/indexer/backfill` - Trigger backfill
  - `POST /api/v1/indexer/index-now` - Immediate indexing run

### Persona Integration

Identity verification management via Persona API:

- Create and manage Persona inquiries
- Monitor verification status
- Process webhook events
- Track risk signals

### SOC2 Foundations

- **RBAC**: Role-based access control with system and tenant roles
- **Tenant Isolation**: Multi-tenant architecture with data isolation
- **Audit Logging**: Structured audit trails for all admin actions
- **Secure Secrets**: Integration with Vault / AWS Secrets Manager
- **Structured Logging**: JSON logging with correlation IDs

## API Documentation

When running the backend, API documentation is available at:

- Swagger UI: http://localhost:8000/api/docs
- ReDoc: http://localhost:8000/api/redoc

## MongoDB Collections

Core collections:

- `tenants` - Tenant/organization data
- `users` - User accounts and identity
- `persona_inquiries` - Persona verification records
- `roles` - RBAC role definitions
- `permissions` - Permission matrix
- `on_chain_events` - Indexed Algorand events
- `contract_execution_traces` - Contract execution logs
- `signature_events` - Signature events
- `state_transitions` - State transitions
- `reconciliation_status` - Reconciliation data
- `indexer_configurations` - Indexer config
- `indexer_job_runs` - Indexer job history

## Development

### Running Tests

```bash
cd backend
poetry run pytest
```

### Code Quality

```bash
cd backend
poetry run black app/
poetry run ruff check app/
poetry run mypy app/
```

### Database Access

```bash
# MongoDB shell
make db-shell

# Or connect directly
mongosh mongodb://admin:changeme@localhost:27017/escra_admin?authSource=admin
```

## Deployment

### Environment Files

- `.env.local` - Local development
- `.env.dev` - Development environment
- `.env.staging` - Staging environment
- `.env.prod` - Production environment

### AWS Deployment

The architecture is designed for AWS deployment:

- **ECS Fargate** for containerized services
- **MongoDB Atlas** or self-hosted MongoDB
- **AWS Secrets Manager** for secrets
- **Application Load Balancer** for HTTPS

## License

Proprietary - Escra Platform

