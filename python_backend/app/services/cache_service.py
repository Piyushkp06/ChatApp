"""
Cache Service - Redis integration for unread counts
"""
from typing import Any, Dict, Optional
import redis
from app.config.settings import settings

class CacheService:
    def __init__(self):
        self.client: Optional[Any] = None
        self.connected = False
        self._connect()
    
    def _connect(self):
        """Try to connect to Redis"""
        try:
            self.client = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                decode_responses=True
            )
            self.client.ping()
            self.connected = True
            print("✅ Connected to Redis")
        except Exception as e:
            print(f"⚠️ Redis not available: {e}")
            self.connected = False
    
    def is_available(self) -> bool:
        """Check if Redis is available"""
        return self.connected
    
    async def clear_unread(self, user_id: str, from_id: str) -> bool:
        """Clear unread count for a specific contact"""
        if not self.connected or self.client is None:
            return False
        try:
            self.client.hdel(f"unread:{user_id}", from_id)
            return True
        except Exception as e:
            print(f"Redis clear_unread error: {e}")
            return False
    
    async def get_unread_counts(self, user_id: str) -> Dict[str, Any]:
        """Get all unread counts for a user"""
        if not self.connected or self.client is None:
            return {}
        try:
            result = self.client.hgetall(f"unread:{user_id}")
            return result if isinstance(result, dict) else {}
        except Exception as e:
            print(f"Redis get_unread_counts error: {e}")
            return {}

# Singleton instance
cache_service = CacheService()
