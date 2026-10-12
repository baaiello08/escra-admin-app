"""
Structured Logging Configuration

SOC2-aligned structured JSON logging with correlation IDs, tenant context, and audit trail support.
"""

import logging
import sys
from typing import Any, Dict
import structlog
from structlog.types import Processor


def setup_logging() -> structlog.BoundLogger:
    """
    Configure structured logging with JSON output.
    Returns configured logger instance.
    """
    # Configure standard library logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=logging.INFO,
    )
    
    # Configure structlog processors
    processors: list[Processor] = [
        structlog.contextvars.merge_contextvars,  # Merge context variables
        structlog.stdlib.add_log_level,  # Add log level
        structlog.stdlib.add_logger_name,  # Add logger name
        structlog.processors.TimeStamper(fmt="iso"),  # ISO 8601 timestamps
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,  # Format exceptions
    ]
    
    # Add JSON renderer for production, or console for development
    import os
    if os.getenv("LOG_FORMAT", "json") == "json":
        processors.append(structlog.processors.JSONRenderer())
    else:
        processors.append(structlog.dev.ConsoleRenderer())
    
    structlog.configure(
        processors=processors,
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )
    
    return structlog.get_logger()


def get_logger(name: str = None) -> structlog.BoundLogger:
    """Get a logger instance with optional name."""
    if name:
        return structlog.get_logger(name)
    return structlog.get_logger()

