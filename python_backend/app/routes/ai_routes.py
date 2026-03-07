"""
AI Routes - API endpoints for AI features
"""
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.middlewares.auth import verify_token
from app.controllers.ai_controller import generate_ai_response

router = APIRouter()

# Request Models
class GenerateRequest(BaseModel):
    content: str
    userId: Optional[str] = None  # Optional for socket-based requests

# Response Models
class MessageResponse(BaseModel):
    _id: str
    sender: dict
    recipient: dict
    content: str
    messageType: str
    timestamp: Optional[str] = None

class GenerateResponse(BaseModel):
    userMessage: dict
    aiMessage: dict

@router.post("/generate", response_model=GenerateResponse)
async def generate(request: Request, body: GenerateRequest):
    """
    Generate AI response for user message
    Supports both JWT auth and direct userId for internal calls
    """
    # Check if userId is provided directly (internal socket call)
    if body.userId:
        user_id = body.userId
    else:
        # Verify authentication via JWT
        user_id = await verify_token(request)
    
    if not body.content or not body.content.strip():
        raise HTTPException(status_code=400, detail="Content is required")
    
    try:
        result = await generate_ai_response(user_id, body.content)
        return result
    except Exception as e:
        print(f"Generate AI error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate AI response")

@router.get("/health")
async def health():
    """Health check for AI service"""
    return {"status": "OK", "service": "AI"}
