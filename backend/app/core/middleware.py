"""
Core Middleware Stack

SOC2-aligned middleware for request logging, tenant resolution, audit trails, and security.
"""

import time
import uuid
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import structlog

logger = structlog.get_logger()


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Structured request/response logging middleware.
    Logs all incoming requests with correlation IDs, timing, and status codes.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate correlation ID for request tracing
        correlation_id = str(uuid.uuid4())
        request.state.correlation_id = correlation_id
        
        # Extract request context
        start_time = time.time()
        method = request.method
        path = request.url.path
        client_ip = request.client.host if request.client else None
        
        # Log request
        logger.info(
            "Incoming request",
            correlation_id=correlation_id,
            method=method,
            path=path,
            client_ip=client_ip,
            query_params=dict(request.query_params),
        )
        
        try:
            response = await call_next(request)
        except Exception as e:
            # Log exceptions
            process_time = time.time() - start_time
            logger.error(
                "Request failed",
                correlation_id=correlation_id,
                method=method,
                path=path,
                error=str(e),
                process_time_ms=process_time * 1000,
            )
            raise
        
        # Log response
        process_time = time.time() - start_time
        logger.info(
            "Request completed",
            correlation_id=correlation_id,
            method=method,
            path=path,
            status_code=response.status_code,
            process_time_ms=process_time * 1000,
        )
        
        # Add correlation ID to response headers
        response.headers["X-Correlation-ID"] = correlation_id
        
        return response


class TenantResolutionMiddleware(BaseHTTPMiddleware):
    """
    Tenant resolution middleware.
    Extracts tenant context and user info from headers or JWT token and attaches to request state.
    Ensures tenant isolation for multi-tenant architecture.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip tenant resolution for health checks and public endpoints
        if request.url.path in ["/health", "/ready", "/api/docs", "/api/redoc", "/api/openapi.json"]:
            return await call_next(request)
        
        # Extract tenant ID from headers (X-Tenant-ID) or from JWT token
        tenant_id = request.headers.get("X-Tenant-ID")
        
        # Try to extract user info from JWT token
        current_user = None
        authorization = request.headers.get("Authorization")
        if authorization and authorization.startswith("Bearer "):
            token = authorization.replace("Bearer ", "")
            from app.core.security import decode_token
            payload = decode_token(token)
            if payload:
                # Extract user info from token (without full DB lookup for middleware)
                current_user = {
                    "user_id": payload.get("sub"),
                    "tenant_id": payload.get("tenant_id") or tenant_id,
                    "email": payload.get("email"),
                    "roles": payload.get("roles", []),
                    "permissions": payload.get("permissions", []),
                }
                # Use tenant_id from token if not in header
                if not tenant_id and current_user.get("tenant_id"):
                    tenant_id = current_user.get("tenant_id")
        
        request.state.tenant_id = tenant_id
        if current_user:
            request.state.current_user = current_user
        
        # Add tenant context to logging
        if tenant_id:
            structlog.contextvars.bind_contextvars(tenant_id=tenant_id)
        
        response = await call_next(request)
        
        # Clear context after request
        structlog.contextvars.clear_contextvars()
        
        return response


class AuditLoggingMiddleware(BaseHTTPMiddleware):
    """
    Audit logging middleware.
    Emits audit events for administrative actions (create, update, delete operations).
    SOC2 requirement for audit trails.
    """

    # HTTP methods that require audit logging
    AUDIT_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
    
    # Paths to exclude from audit logging (health checks, read-only endpoints)
    EXCLUDED_PATHS = {
        "/health",
        "/ready",
        "/api/docs",
        "/api/redoc",
        "/api/openapi.json",
    }

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip audit logging for excluded paths
        if request.url.path in self.EXCLUDED_PATHS:
            return await call_next(request)
        
        # Skip audit logging for read-only operations
        if request.method not in self.AUDIT_METHODS:
            return await call_next(request)
        
        # Extract user context (if authenticated)
        user_id = None
        user_email = None
        tenant_id = getattr(request.state, "tenant_id", None)
        
        # Try to extract user from request state (set by auth middleware)
        if hasattr(request.state, "current_user"):
            current_user = request.state.current_user
            user_id = current_user.get("user_id")
            user_email = current_user.get("email")
            if not tenant_id:
                tenant_id = current_user.get("tenant_id")
        
        # Execute request
        response = await call_next(request)
        
        # Emit audit event for state-changing operations
        if response.status_code < 400:  # Only log successful operations
            # Map HTTP method to action type
            action_type_map = {
                "POST": "create",
                "PUT": "update",
                "PATCH": "update",
                "DELETE": "delete",
            }
            base_action = action_type_map.get(request.method, "unknown")
            
            # Determine target type from path
            path_parts = request.url.path.strip("/").split("/")
            target_type = None
            target_id = None
            if len(path_parts) >= 3 and path_parts[0] == "api" and path_parts[1] == "v1":
                target_type = path_parts[2]  # e.g., "tenants", "users"
                if len(path_parts) > 3:
                    target_id = path_parts[3]  # Resource ID
            
            # Create action description
            action_description = f"{request.method} {request.url.path}"
            if target_type and target_id:
                action_description = f"{base_action.title()} {target_type[:-1]} {target_id}"
            elif target_type:
                action_description = f"{base_action.title()} {target_type}"
            
            # Prepare audit log entry
            from app.models.audit import AuditActionType
            from app.repositories.audit_repository import AuditRepository
            from bson import ObjectId as BsonObjectId
            
            # Convert string IDs to ObjectId
            actor_user_id_obj = None
            if user_id:
                try:
                    actor_user_id_obj = BsonObjectId(user_id)
                except Exception:
                    pass  # Invalid ObjectId, leave as None
            
            tenant_id_obj = None
            if tenant_id:
                try:
                    tenant_id_obj = BsonObjectId(tenant_id)
                except Exception:
                    pass  # Invalid ObjectId, leave as None
            
            audit_data = {
                "actor_user_id": actor_user_id_obj,
                "actor_email": user_email,
                "actor_ip": request.client.host if request.client else None,
                "actor_user_agent": request.headers.get("user-agent"),
                "action_type": AuditActionType.CONFIG_CHANGE,  # Default, will be refined
                "action_description": action_description,
                "target_type": target_type,
                "target_id": target_id,
                "target_tenant_id": tenant_id_obj,
                "tenant_id": tenant_id_obj,
                "request_id": getattr(request.state, "correlation_id", None),
                "success": response.status_code < 400,
                "metadata": {
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": response.status_code,
                },
            }
            
            # Map to specific action types
            if target_type == "tenants":
                if request.method == "POST":
                    audit_data["action_type"] = AuditActionType.TENANT_CREATE
                elif request.method in ["PUT", "PATCH"]:
                    audit_data["action_type"] = AuditActionType.TENANT_UPDATE
                elif request.method == "DELETE":
                    audit_data["action_type"] = AuditActionType.TENANT_DELETE
            elif target_type == "users":
                if request.method == "POST":
                    audit_data["action_type"] = AuditActionType.USER_CREATE
                elif request.method in ["PUT", "PATCH"]:
                    audit_data["action_type"] = AuditActionType.USER_UPDATE
                elif request.method == "DELETE":
                    audit_data["action_type"] = AuditActionType.USER_DELETE
            
            # Write to audit log collection
            try:
                audit_repo = AuditRepository()
                await audit_repo.create(audit_data)
            except Exception as e:
                # Don't fail the request if audit logging fails
                logger.error("Failed to write audit log", error=str(e), path=request.url.path)
        
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Security headers middleware.
    Adds security-related HTTP headers for SOC2 compliance.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        
        # Add security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        return response

