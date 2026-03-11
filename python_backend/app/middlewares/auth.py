"""
JWT Authentication Middleware
Validates JWT tokens from cookies (matching Node.js implementation)
"""
import jwt
from fastapi import Request, HTTPException
from fastapi.security import HTTPBearer
from app.config.settings import settings

security = HTTPBearer(auto_error=False)

async def verify_token(request: Request) -> str:
    """
    Verify JWT token from cookies
    Returns the user ID if valid
    """
    # Get token from cookies (matching Node.js cookie name)
    token = request.cookies.get("jwt")
    
    if not token:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. No token provided."
        )
    
    try:
        # Decode JWT token using the same secret as Node.js
        payload = jwt.decode(
            token,
            settings.JWT_KEY,
            algorithms=["HS256"]
        )
        
        user_id = payload.get("userId")
        
        if not user_id:
            raise HTTPException(
                status_code=401,
                detail="Invalid token payload"
            )
        
        return user_id
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid token: {str(e)}"
        )

async def get_current_user_id(request: Request) -> str:
    """
    Dependency to get current user ID from JWT token
    """
    return await verify_token(request)
