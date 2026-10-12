"""
Base Models and Common Fields

Shared base classes for MongoDB documents and Pydantic schemas.
"""

from datetime import datetime
from typing import Optional, Generic, TypeVar, List
from pydantic import BaseModel, Field
from bson import ObjectId

T = TypeVar('T')


class PyObjectId(ObjectId):
    """Custom ObjectId type for Pydantic models (Pydantic v2 compatible)."""

    @classmethod
    def __get_pydantic_core_schema__(cls, source_type, handler):
        from pydantic_core import core_schema
        # Accept raw ObjectId values straight from MongoDB as well as strings
        return core_schema.no_info_before_validator_function(
            lambda v: str(v) if isinstance(v, ObjectId) else v,
            core_schema.no_info_after_validator_function(
                cls.validate,
                core_schema.str_schema(),
            ),
        )

    @classmethod
    def validate(cls, v):
        if isinstance(v, ObjectId):
            return v
        if isinstance(v, str):
            if not ObjectId.is_valid(v):
                raise ValueError("Invalid ObjectId")
            return ObjectId(v)
        raise ValueError("Invalid ObjectId")

    def __str__(self):
        return str(super())


class BaseSchema(BaseModel):
    """Base Pydantic schema with common fields."""

    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {ObjectId: str},
        "json_schema_extra": {
            "example": {
                "id": "507f1f77bcf86cd799439011",
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z",
            }
        },
    }


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated response wrapper for list endpoints."""
    
    items: List[T] = Field(..., description="List of items for the current page")
    total: int = Field(..., description="Total number of items across all pages")
    page: int = Field(..., description="Current page number (1-indexed)")
    page_size: int = Field(..., description="Number of items per page")
    total_pages: int = Field(..., description="Total number of pages")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "items": [],
                "total": 100,
                "page": 1,
                "page_size": 20,
                "total_pages": 5,
            }
        },
    }

