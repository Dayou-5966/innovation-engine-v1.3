import os
import typing
import bcrypt
import jwt
from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv

load_dotenv()

# JWT_SECRET is used exclusively for signing tokens — separate from the login password
_DEFAULT_JWT_SECRET = "innovation-engine-jwt-secret-key"
JWT_SECRET = os.environ.get("JWT_SECRET", "").strip()
if not JWT_SECRET or JWT_SECRET == _DEFAULT_JWT_SECRET:
    import sys
    sys.stderr.write(
        "[FATAL] JWT_SECRET is not set or is the insecure default value. "
        "Please set a unique secret in your .env file before starting the server.\n"
    )
    sys.exit(1)
# ADMIN_HASH is the bcrypt hash of the actual gateway password stored in .env
ADMIN_HASH = os.environ.get("ADMIN_HASH", "").strip()
ALGORITHM = "HS256"
security = HTTPBearer()


def verify_password(plain_password: str) -> bool:
    """Verifies an incoming plaintext password against the stored bcrypt hash."""
    if not ADMIN_HASH:
        # Fallback: if no hash is configured, check against legacy plain ADMIN_SECRET
        fallback = os.environ.get("ADMIN_SECRET", "EUREKA")
        return plain_password == fallback
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), ADMIN_HASH.encode("utf-8"))
    except Exception:
        return False


def create_access_token(username: str = "admin") -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=24)
    payload: dict = {"sub": username, "exp": expire}
    encoded_jwt = jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        sub = payload.get("sub")
        if not sub:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
