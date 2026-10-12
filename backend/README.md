# Escra Admin Portal Backend

Production-grade Python FastAPI backend for Escra admin portal with SOC2-aligned security foundations.

## Architecture

- **Framework**: FastAPI with async/await support
- **Database**: MongoDB (Motor for async, PyMongo for sync operations)
- **Authentication**: JWT-based with RBAC middleware
- **Logging**: Structured JSON logging with structlog
- **Observability**: OpenTelemetry + Prometheus metrics
- **Secrets**: Vault / AWS Secrets Manager integration

## Project Structure

```
app/
├── api/              # REST API routers grouped by domain
├── services/         # Business logic layer
├── repositories/     # MongoDB data access layer
├── models/           # Domain models (Pydantic + MongoDB ODM)
├── core/             # Core infrastructure (config, security, logging, middleware)
└── indexer/          # Escra Indexer subsystem (Algorand ingestion)
```

## Local Development

```bash
# Install dependencies
poetry install

# Run with hot reload
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run tests
poetry run pytest

# Format code
poetry run black app/
poetry run ruff check app/
```

## Environment Variables

See `.env.local.example` for required environment variables.

