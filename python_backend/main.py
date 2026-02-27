"""
Python AI Backend for ChatApp
Handles all AI-related features including chat and summarization
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from contextlib import asynccontextmanager

from app.config.database import connect_db, close_db
from app.routes import ai_routes

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events"""
    # Startup
    await connect_db()
    print("🚀 Python AI Backend started")
    yield
    # Shutdown
    await close_db()
    print("👋 Python AI Backend shutdown")

app = FastAPI(
    title="ChatApp AI Backend",
    description="AI-powered features for ChatApp including chat and summarization",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
origins = [
    os.getenv("ORIGIN", "http://localhost:5173"),
    "http://localhost:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(ai_routes.router, prefix="/api/ai", tags=["AI"])

# Health check endpoint
@app.get("/api/health")
async def health_check():
    return {
        "status": "OK",
        "service": "Python AI Backend",
        "version": "1.0.0"
    }

@app.get("/")
async def root():
    return {"message": "ChatApp AI Backend is running"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
