"""
Settings configuration
"""
import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    JWT_KEY: str = os.getenv("JWT_KEY", "")
    PORT: int = int(os.getenv("PORT", "8000"))
    NODE_BACKEND_URL: str = os.getenv("NODE_BACKEND_URL", "http://localhost:8597")
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    AI_SYSTEM_ID: str = os.getenv("AI_SYSTEM_ID", "649e8c5a3c2d3a1b9a5f4e2a")
    ORIGIN: str = os.getenv("ORIGIN", "http://localhost:5173")

settings = Settings()
