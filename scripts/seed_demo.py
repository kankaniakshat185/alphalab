# ruff: noqa: E402, I001
import asyncio
import os
import sys

from passlib.context import CryptContext

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src")))

from alphalab.api.database.connection import async_session_maker
from alphalab.api.models.experiment import Experiment
from alphalab.api.models.factor import Factor
from alphalab.api.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

from alphalab.worker.tasks import _run_backtest_async, _run_robustness_async  # noqa: E402


async def seed_demo() -> None:
    print("Connecting to database to seed demo...")
    async with async_session_maker() as session:
        # Create Demo User
        demo_user_email = "demo@alphalab.hq"
        from sqlalchemy.future import select
        existing_user = await session.execute(select(User).where(User.email == demo_user_email))
        user = existing_user.scalar_one_or_none()

        if not user:
            # Use hardcoded hash to bypass passlib bug in Python 3.13
            hashed_pw = "$2b$12$LQv3c1yqSN9z.B1B/UvWk.v.TjE7e7zE/U/U/U/U/U/U/U/U/U/U"
            user = User(
                email=demo_user_email,
                name="System Administrator",
                hashed_password=hashed_pw
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)
            print(f"Created demo user: {user.email}")
        else:
            print("Demo user already exists.")

        # Create Demo Experiment
        experiment = Experiment(
            user_id=user.id,
            name="AlphaLab Demo Showcase",
            description="Preloaded demonstration of a Risk-Adjusted Momentum strategy."
        )
        session.add(experiment)
        await session.commit()
        await session.refresh(experiment)
        print(f"Created demo experiment: {experiment.id}")

        # Create Demo Factor
        factor = Factor(
            experiment_id=experiment.id,
            name="Risk-Adjusted Momentum",
            formula="Momentum(20) / Volatility(20)"
        )
        session.add(factor)
        await session.commit()
        await session.refresh(factor)
        print(f"Created demo factor: {factor.id}")

    # Run Backtest and Robustness Grid synchronously
    print("Executing Backtest...")
    await _run_backtest_async(str(factor.id))

    print("Executing Robustness Grid...")
    await _run_robustness_async(str(factor.id))

    print("Demo completely seeded successfully!")


if __name__ == "__main__":
    asyncio.run(seed_demo())
