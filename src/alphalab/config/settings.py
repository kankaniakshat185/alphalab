"""
alphalab.config.settings
=========================
Manages global configuration parameters and environment variable loading.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Global configuration settings class for AlphaLab."""

    # Storage Settings
    DUCKDB_PATH: str = "internal/data/alphalab.db"
    DUCKDB_MEMORY_LIMIT: str = "2GB"

    # Yahoo Provider Settings
    YAHOO_HTTP_TIMEOUT: int = 15
    YAHOO_MAX_RETRIES: int = 3

    # Validation Settings
    PRICE_JUMP_THRESHOLD: float = 0.15

    # Database connection parameters (to be used in Phase 6, skeleton here)
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "alphalab"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432

    # Settings configuration
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


# Instantiate settings singleton
settings = Settings()
