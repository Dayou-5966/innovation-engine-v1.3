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
JWT_SECRET = os.environ.get("JWT_SECRET", "innovation-engine-jwt-secret-key")
# ADMIN_HASH is the bcrypt hash of the actual gateway password stored in .env
ADMIN_HASH = os.environ.get("ADMIN_HASH", "").strip()
ALGORITHM = "HS256"
MULTI_USER_MODE = os.environ.get("MULTI_USER_MODE", "false").lower() == "true"

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


def verify_user_password(plain_password: str, stored_hash: str) -> bool:
    """Verifies a plaintext password against a per-user bcrypt hash."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), stored_hash.encode("utf-8"))
    except Exception:
        return False


def hash_password(plain_password: str) -> str:
    """Hash a plaintext password with bcrypt."""
    return bcrypt.hashpw(plain_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def create_access_token(username: str = "admin", user_id: typing.Optional[int] = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=24)
    payload: dict = {"sub": username, "exp": expire}
    if user_id is not None:
        payload["uid"] = user_id
    encoded_jwt = jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        sub = payload.get("sub")
        if not sub:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        # Legacy tokens only have sub="admin"; multi-user tokens also carry uid
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_user_id_from_token(payload: dict) -> typing.Optional[int]:
    """Extract user_id from token payload. Returns None for legacy admin tokens."""
    return payload.get("uid")
