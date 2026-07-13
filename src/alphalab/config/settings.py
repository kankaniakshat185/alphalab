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
    DUCKDB_MEMORY_LIMIT: str = "256MB"

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
            
        # Strip all query parameters that confuse asyncpg (like channel_binding, options, sslmode)
        # and strictly append ?ssl=require if it's a remote connection
        if "?" in url:
            base_url = url.split("?")[0]
            url = f"{base_url}?ssl=require"
            
        return url

    # Redis Task Broker URL
    REDIS_URL: str = "redis://:redis_local_password_change_me@localhost:6379/0"

    @property
    def async_redis_url(self) -> str:
        """Automatically adds ssl_cert_reqs for celery if using rediss:// and encodes password"""
        from urllib.parse import urlparse, urlunparse, quote
        url = self.REDIS_URL
        
        # Safely URL-encode the password if it contains special characters
        parsed = urlparse(url)
        if '@' in parsed.netloc:
            creds, host = parsed.netloc.rsplit('@', 1)
            if ':' in creds:
                user, pwd = creds.split(':', 1)
                # Only quote if not already quoted (simple heuristic: if it has special unquoted chars)
                if not ("%" in pwd and len(pwd) > 2):
                    pwd = quote(pwd)
                new_netloc = f"{user}:{pwd}@{host}"
                parsed = parsed._replace(netloc=new_netloc)
                url = urlunparse(parsed)
        
        if url.startswith("rediss://") and "ssl_cert_reqs=" not in url:
            separator = "&" if "?" in url else "?"
            url = f"{url}{separator}ssl_cert_reqs=CERT_NONE"
            
        return url

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
