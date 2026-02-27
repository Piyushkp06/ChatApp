"""
Database configuration and connection management
"""
import os
from typing import Any, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

client: Optional[Any] = None
db: Optional[Any] = None

async def connect_db():
    """Connect to MongoDB"""
    global client, db
    try:
        client = AsyncIOMotorClient(DATABASE_URL)
        db = client.get_default_database()
        # Test connection
        await client.admin.command('ping')
        print("✅ Connected to MongoDB")
    except Exception as e:
        print(f"❌ MongoDB connection error: {e}")
        raise e

async def close_db():
    """Close MongoDB connection"""
    global client
    if client:
        client.close()
        print("🔌 MongoDB connection closed")

def get_db():
    """Get database instance"""
    return db

def get_collection(name: str):
    """Get a collection by name"""
    return db[name] if db else None
