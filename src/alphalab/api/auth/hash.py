"""
alphalab.api.auth.hash
======================
Utility routines for password hashing using passlib.
"""

import bcrypt


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Check if the plain text password matches the saved hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """Generate a bcrypt hash of the plain text password."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")
