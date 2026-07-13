"""
alphalab.api.main
=================
Main entrypoint assembling the FastAPI web service application.
"""

from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from alphalab.api.database.connection import async_engine
from alphalab.api.routers.auth import router as auth_router
from alphalab.api.routers.experiments import router as experiments_router
from alphalab.api.routers.factors import router as factors_router
from alphalab.api.routers.users import router as users_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> Any:
    # Auto-migrate: run queries to add missing columns in PostgreSQL if they don't exist
    queries = [
        "ALTER TABLE backtest_results ADD COLUMN IF NOT EXISTS verdict_sharpe VARCHAR;",
        "ALTER TABLE backtest_results ADD COLUMN IF NOT EXISTS verdict_ic VARCHAR;",
        "ALTER TABLE backtest_results ADD COLUMN IF NOT EXISTS verdict_mdd VARCHAR;",
        "ALTER TABLE backtest_results ADD COLUMN IF NOT EXISTS daily_mean DOUBLE PRECISION;",
        "ALTER TABLE backtest_results ADD COLUMN IF NOT EXISTS daily_std DOUBLE PRECISION;",
        "ALTER TABLE backtest_results ADD COLUMN IF NOT EXISTS mdd_peak_date VARCHAR;",
        "ALTER TABLE backtest_results ADD COLUMN IF NOT EXISTS mdd_trough_date VARCHAR;",
        "ALTER TABLE robustness_results ADD COLUMN IF NOT EXISTS verdict_robustness VARCHAR;",
        "ALTER TABLE robustness_results ADD COLUMN IF NOT EXISTS stressed_equity_curve JSON;",
    ]
    try:
        async with async_engine.begin() as conn:
            for q in queries:
                await conn.execute(text(q))
    except Exception as e:
        import logging

        logging.getLogger("alphalab.api.main").error(
            f"Error executing database auto-migrations: {e}"
        )
    yield


app = FastAPI(
    title="AlphaLab API",
    description="Quantitative factor research and backtesting platform.",
    version="1.0.0",
    lifespan=lifespan,
)

# Set up CORS middleware to support web client connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register endpoints routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(experiments_router)
app.include_router(factors_router)


@app.get("/")
async def root() -> dict[str, str]:
    """Verify that the API is online and return basic service info."""
    return {
        "status": "online",
        "service": "AlphaLab API",
        "version": "1.0.0",
    }
