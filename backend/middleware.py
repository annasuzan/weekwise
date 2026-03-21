from fastapi import Request, HTTPException
from jose import JWTError
from auth import verify_jwt


async def require_auth(request: Request) -> dict:
    token = request.cookies.get("token")
    if not token:
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        return verify_jwt(token)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")