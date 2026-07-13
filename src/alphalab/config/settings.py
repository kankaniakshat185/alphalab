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

    # Database connection parameters
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres_local_password_change_me"
    POSTGRES_DB: str = "alphalab"
    POSTGRES_HOST: str = "localhost"
    # Local Dev / UI Iteration Mode
    MOCK_MODE: bool = False

    # Async Database URL
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres_local_password_change_me@localhost:5432/alphalab"

    @property
    def async_database_url(self) -> str:
        """Automatically converts a standard postgresql:// URL to postgresql+asyncpg://"""
        url = self.DATABASE_URL
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
            
        # asyncpg does not accept 'sslmode=', it expects 'ssl='
        if "sslmode=" in url:
            url = url.replace("sslmode=", "ssl=")
            
        return url

    # Redis Task Broker URL
    REDIS_URL: str = "redis://:redis_local_password_change_me@localhost:6379/0"

    # JWT Authentication Settings
    JWT_SECRET: str = "change_me_in_production_extremely_long_secret_key_here"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 45

    # Settings configuration
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


# Instantiate settings singleton
settings = Settings()
