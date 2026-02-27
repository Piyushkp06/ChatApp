"""
Cache Service - Upstash Redis REST API integration
"""
from typing import Any, Dict, Optional
import os
from dotenv import load_dotenv

load_dotenv()

# Try to import upstash_redis, fallback gracefully if not available
try:
    from upstash_redis import Redis
    UPSTASH_AVAILABLE = True
except ImportError:
    UPSTASH_AVAILABLE = False
    Redis = None

class CacheService:
    def __init__(self):
        self.client: Optional[Any] = None
        self.connected = False
        self._connect()
    
    def _connect(self):
        """Try to connect to Upstash Redis"""
        if not UPSTASH_AVAILABLE:
            print("⚠️ upstash-redis not installed - running without cache")
            return
            
        try:
            url = os.getenv("UPSTASH_REDIS_REST_URL")
            token = os.getenv("UPSTASH_REDIS_REST_TOKEN")
            
            if not url or not token:
                print("⚠️ Upstash credentials not found - running without cache")
                return
            
            self.client = Redis(url=url, token=token)
            self.connected = True
            print("✅ Connected to Upstash Redis")
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
