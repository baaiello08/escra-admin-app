"""
Escra Admin Portal - Main FastAPI Application Entrypoint

Production-grade admin API with SOC2-aligned security, Persona identity management,
and Escra Indexer subsystem for Algorand transaction ingestion.
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from bson.errors import InvalidId

from app.core.config import get_settings
from app.core.logging import setup_logging
from app.core.middleware import (
    AuditLoggingMiddleware,
    TenantResolutionMiddleware,
    RequestLoggingMiddleware,
)
from app.core.exceptions import (
    validation_exception_handler,
    http_exception_handler,
    invalid_id_exception_handler,
    general_exception_handler,
)
from app.api.v1.router import api_router
from app.core.database import init_db, close_db

settings = get_settings()

# Initialize structured logging
logger = setup_logging()

# Import version from __init__.py
try:
    from app import __version__
except ImportError:
    __version__ = "0.1.0"


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan manager for startup and shutdown events.
    Handles database initialization and cleanup.
    """
    logger.info("Starting Escra Admin Portal backend", version=__version__)
    
    # Initialize MongoDB connection
    await init_db()
    logger.info("MongoDB connection initialized")
    
    yield
    
    # Cleanup on shutdown
    await close_db()
    logger.info("Shutting down Escra Admin Portal backend")


app = FastAPI(
    title="Escra Admin Portal API",
    description="Production-grade admin API for Escra platform with Persona identity management and Escra Indexer",
    version="0.1.0",
    docs_url="/api/docs" if settings.environment != "production" else None,
    redoc_url="/api/redoc" if settings.environment != "production" else None,
    openapi_url="/api/openapi.json" if settings.environment != "production" else None,
    lifespan=lifespan,
)

# CORS configuration - restrict in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# SOC2-aligned middleware stack (order matters)
app.add_middleware(RequestLoggingMiddleware)  # First: log all requests
app.add_middleware(TenantResolutionMiddleware)  # Second: resolve tenant context
app.add_middleware(AuditLoggingMiddleware)  # Third: emit audit events

# Register exception handlers
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(InvalidId, invalid_id_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# Include API routers
app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    """Health check endpoint for load balancer probes."""
    return {"status": "healthy", "service": "escra-admin-api"}


@app.get("/ready")
async def readiness_check():
    """Readiness probe - checks database connectivity."""
    from app.core.database import check_db_connection
    
    db_healthy = await check_db_connection()
    if not db_healthy:
        from fastapi import status
        from fastapi.responses import JSONResponse
        
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "unhealthy", "reason": "database_unavailable"},
        )
    
    return {"status": "ready", "service": "escra-admin-api"}


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.environment == "development",
    )

