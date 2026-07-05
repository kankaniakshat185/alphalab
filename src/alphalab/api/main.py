"""
alphalab.api.main
=================
Main entrypoint assembling the FastAPI web service application.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from alphalab.api.routers.auth import router as auth_router
from alphalab.api.routers.experiments import router as experiments_router
from alphalab.api.routers.users import router as users_router

app = FastAPI(
    title="AlphaLab API",
    description="Quantitative factor research and backtesting platform.",
    version="1.0.0",
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


@app.get("/")
async def root() -> dict:
    """Verify that the API is online and return basic service info."""
    return {
        "status": "online",
        "service": "AlphaLab API",
        "version": "1.0.0",
    }
