"""
Core Configuration Management

SOC2-aligned configuration with environment-based settings and secure secrets management.
Supports Vault / AWS Secrets Manager integration.
"""

from functools import lru_cache
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    Supports .env files and secure secrets integration.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Environment
    environment: str = Field(default="development", description="Environment: development, staging, production")
    debug: bool = Field(default=False, description="Debug mode")

    # Application
    app_name: str = Field(default="Escra Admin Portal", description="Application name")
    api_version: str = Field(default="v1", description="API version")
    secret_key: str = Field(..., description="Secret key for JWT signing (load from secrets manager in prod)")
    access_token_expire_minutes: int = Field(default=60, description="JWT access token expiration (minutes)")
    refresh_token_expire_days: int = Field(default=7, description="Refresh token expiration (days)")

    # CORS
    cors_origins: List[str] = Field(
        default_factory=lambda: ["http://localhost:3000", "http://localhost:3001"],
        description="Allowed CORS origins",
    )

    # MongoDB - Connects to the Escra app's database
    # This admin portal reads from and writes to the same MongoDB instance used by the Escra application
    mongodb_url: str = Field(
        default="mongodb://localhost:27017",
        description="MongoDB connection URL (should point to Escra app's MongoDB instance)",
    )
    mongodb_db_name: str = Field(
        default="escra", 
        description="MongoDB database name (should match Escra app's database name)"
    )

    # HashiCorp Vault (optional, for production secrets)
    vault_enabled: bool = Field(default=False, description="Enable Vault integration")
    vault_url: Optional[str] = Field(default=None, description="Vault server URL")
    vault_token: Optional[str] = Field(default=None, description="Vault token (or use AWS auth)")

    # AWS Secrets Manager (alternative to Vault)
    aws_secrets_manager_enabled: bool = Field(default=False, description="Enable AWS Secrets Manager")
    aws_region: Optional[str] = Field(default=None, description="AWS region")
    aws_secrets_prefix: str = Field(default="escra/admin", description="Secrets prefix in Secrets Manager")

    # Persona Identity Verification
    persona_api_key: str = Field(..., description="Persona API key")
    persona_webhook_secret: str = Field(..., description="Persona webhook verification secret")
    persona_base_url: str = Field(default="https://withpersona.com/api/v1", description="Persona API base URL")

    # Algorand Configuration
    algorand_network: str = Field(default="testnet", description="Algorand network: testnet, mainnet")
    algorand_indexer_url: str = Field(
        default="https://testnet-idx.algonode.cloud",
        description="Algorand indexer API URL",
    )
    algorand_node_url: str = Field(
        default="https://testnet-api.algonode.cloud",
        description="Algorand node API URL",
    )

    # Escra Indexer Configuration
    indexer_enabled: bool = Field(default=True, description="Enable Escra Indexer subsystem")
    indexer_poll_interval_seconds: int = Field(default=5, description="Indexer poll interval (seconds)")
    indexer_batch_size: int = Field(default=100, description="Batch size for transaction ingestion")
    indexer_max_lag_blocks: int = Field(default=100, description="Max acceptable lag (blocks) before alerting")

    # Logging
    log_level: str = Field(default="INFO", description="Log level: DEBUG, INFO, WARNING, ERROR")
    log_format: str = Field(default="json", description="Log format: json, text")

    # Observability
    enable_metrics: bool = Field(default=True, description="Enable Prometheus metrics")
    metrics_port: int = Field(default=9090, description="Metrics port")
    enable_tracing: bool = Field(default=True, description="Enable OpenTelemetry tracing")

    @field_validator("environment")
    @classmethod
    def validate_environment(cls, v: str) -> str:
        """Validate environment value."""
        allowed = {"development", "staging", "production"}
        if v not in allowed:
            raise ValueError(f"environment must be one of {allowed}")
        return v.lower()

    @field_validator("algorand_network")
    @classmethod
    def validate_algorand_network(cls, v: str) -> str:
        """Validate Algorand network value."""
        allowed = {"testnet", "mainnet", "betanet"}
        if v not in allowed:
            raise ValueError(f"algorand_network must be one of {allowed}")
        return v.lower()

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v) -> List[str]:
        """Parse CORS origins from comma-separated string or list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v

    def load_secrets_from_vault(self) -> None:
        """
        Load secrets from HashiCorp Vault.
        Called during application startup if vault_enabled is True.
        """
        if not self.vault_enabled or not self.vault_url:
            return

        try:
            import hvac

            client = hvac.Client(url=self.vault_url, token=self.vault_token)
            
            # Load secrets from vault path (adjust path as needed)
            secret_path = f"secret/data/escra/admin"
            response = client.secrets.kv.v2.read_secret_version(path=secret_path)
            
            if "data" in response and "data" in response["data"]:
                secrets = response["data"]["data"]
                # Override settings with secrets
                if "secret_key" in secrets:
                    self.secret_key = secrets["secret_key"]
                if "persona_api_key" in secrets:
                    self.persona_api_key = secrets["persona_api_key"]
                if "persona_webhook_secret" in secrets:
                    self.persona_webhook_secret = secrets["persona_webhook_secret"]
        except Exception as e:
            import structlog
            logger = structlog.get_logger()
            logger.error("Failed to load secrets from Vault", error=str(e))

    def load_secrets_from_aws(self) -> None:
        """
        Load secrets from AWS Secrets Manager.
        Called during application startup if aws_secrets_manager_enabled is True.
        """
        if not self.aws_secrets_manager_enabled:
            return

        try:
            import boto3
            import json

            client = boto3.client("secretsmanager", region_name=self.aws_region)
            secret_name = f"{self.aws_secrets_prefix}/api"
            
            response = client.get_secret_value(SecretId=secret_name)
            secrets = json.loads(response["SecretString"])
            
            # Override settings with secrets
            if "secret_key" in secrets:
                self.secret_key = secrets["secret_key"]
            if "persona_api_key" in secrets:
                self.persona_api_key = secrets["persona_api_key"]
            if "persona_webhook_secret" in secrets:
                self.persona_webhook_secret = secrets["persona_webhook_secret"]
        except Exception as e:
            import structlog
            logger = structlog.get_logger()
            logger.error("Failed to load secrets from AWS Secrets Manager", error=str(e))


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance.
    Loads secrets from Vault or AWS Secrets Manager if enabled.
    """
    settings = Settings()
    
    # Load secrets from secure storage if enabled
    if settings.vault_enabled:
        settings.load_secrets_from_vault()
    elif settings.aws_secrets_manager_enabled:
        settings.load_secrets_from_aws()
    
    return settings

