"""
Authentication API

REST endpoints for user authentication (login, logout, token refresh).
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, EmailStr
import structlog

from app.core.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    get_current_user,
)
from app.repositories.user_repository import UserRepository
from datetime import timedelta

router = APIRouter()
logger = structlog.get_logger()


class LoginRequest(BaseModel):
    """Login request schema."""
    email: EmailStr
    password: str
    tenant_id: Optional[str] = None


class LoginResponse(BaseModel):
    """Login response schema."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: str
    tenant_id: Optional[str]
    email: str
    roles: list[str]
    permissions: list[str]


class TokenRefreshRequest(BaseModel):
    """Token refresh request schema."""
    refresh_token: str


@router.post("/login", response_model=LoginResponse)
async def login(
    login_data: LoginRequest,
    request: Request,
):
    """Authenticate user and return JWT tokens."""
    repository = UserRepository()
    
    # Find user by email (optionally scoped to tenant)
    user = await repository.get_by_email(login_data.email, login_data.tenant_id)
    
    if not user:
        logger.warning("Login attempt with invalid email", email=login_data.email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    
    # Check user status
    if user.status.value == "inactive" or user.status.value == "suspended":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User account is {user.status.value}",
        )
    
    # Verify password
    if not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Password authentication not configured for this user",
        )
    
    if not verify_password(login_data.password, user.password_hash):
        logger.warning("Login attempt with invalid password", email=login_data.email, user_id=str(user.id))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    
    # Update last login
    client_ip = request.client.host if request.client else None
    await repository.update_last_login(str(user.id), client_ip)
    
    # Create tokens
    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "tenant_id": str(user.tenant_id),
        "roles": user.system_roles + user.roles,
        "permissions": user.permissions,
    }
    
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    
    logger.info("User logged in", user_id=str(user.id), email=user.email)
    
    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=str(user.id),
        tenant_id=str(user.tenant_id),
        email=user.email,
        roles=user.system_roles + user.roles,
        permissions=user.permissions,
    )


@router.post("/refresh", response_model=LoginResponse)
async def refresh_token(
    refresh_data: TokenRefreshRequest,
):
    """Refresh access token using refresh token."""
    from app.core.security import decode_token
    
    payload = decode_token(refresh_data.refresh_token)
    
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )
    
    # Fetch user to ensure they still exist and are active
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    
    repository = UserRepository()
    user = await repository.get_by_id(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    if user.status.value == "inactive" or user.status.value == "suspended":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User account is {user.status.value}",
        )
    
    # Create new tokens
    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "tenant_id": str(user.tenant_id),
        "roles": user.system_roles + user.roles,
        "permissions": user.permissions,
    }
    
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    
    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=str(user.id),
        tenant_id=str(user.tenant_id),
        email=user.email,
        roles=user.system_roles + user.roles,
        permissions=user.permissions,
    )


@router.post("/logout")
async def logout(
    current_user: dict = Depends(get_current_user),
):
    """Logout endpoint (client should discard tokens)."""
    logger.info("User logged out", user_id=current_user.get("user_id"))
    return {"message": "Logged out successfully"}


@router.get("/me")
async def get_current_user_info(
    current_user: dict = Depends(get_current_user),
):
    """Get current authenticated user information."""
    return current_user
