"""
API v1 Router

Main router that includes all domain-specific routers.
"""

from fastapi import APIRouter

from app.api.v1 import (
    tenants,
    users,
    persona,
    indexer,
    health,
    auth,
    audit,
    keys,
    billing,
    security,
    support,
    contracts,
    documents,
    signatures,
)

api_router = APIRouter()

# Include domain routers
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(health.router, prefix="/health", tags=["Health"])
api_router.include_router(tenants.router, prefix="/tenants", tags=["Tenants"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(keys.router, prefix="/keys", tags=["Keys & Vault"])
api_router.include_router(billing.router, prefix="/billing", tags=["Billing & Usage"])
api_router.include_router(security.router, prefix="/security", tags=["Security & Risk"])
api_router.include_router(support.router, prefix="/support", tags=["Support"])
api_router.include_router(persona.router, prefix="/persona", tags=["Persona"])
api_router.include_router(indexer.router, prefix="/indexer", tags=["Indexer"])
api_router.include_router(audit.router, prefix="/audit", tags=["Audit"])
api_router.include_router(contracts.router, prefix="/contracts", tags=["Contracts"])
api_router.include_router(documents.router, prefix="/documents", tags=["Documents"])
api_router.include_router(signatures.router, prefix="/signatures", tags=["Signatures"])

