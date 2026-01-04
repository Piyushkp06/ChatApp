import redis from '../config/redis.js';

class CacheService {
  // User caching
  async getUser(userId) {
    try {
      const cached = await redis.get(`user:${userId}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Cache getUser error:', error.message);
      return null;
    }
  }

  async setUser(userId, userData, ttl = 3600) {
    try {
      await redis.setex(`user:${userId}`, ttl, JSON.stringify(userData));
    } catch (error) {
      console.error('Cache setUser error:', error.message);
    }
  }

  async deleteUser(userId) {
    try {
      await redis.del(`user:${userId}`);
    } catch (error) {
      console.error('Cache deleteUser error:', error.message);
    }
  }

  // Session management
  async setSession(userId, token, ttl = 259200) { // 3 days
    try {
      await redis.setex(`session:${userId}`, ttl, token);
    } catch (error) {
      console.error('Cache setSession error:', error.message);
    }
  }

  async getSession(userId) {
    try {
      return await redis.get(`session:${userId}`);
    } catch (error) {
      console.error('Cache getSession error:', error.message);
      return null;
    }
  }

  async deleteSession(userId) {
    try {
      await redis.del(`session:${userId}`);
    } catch (error) {
      console.error('Cache deleteSession error:', error.message);
    }
  }

  // Online users tracking
  async setOnline(userId) {
    try {
      await redis.sadd('online:users', userId.toString());
    } catch (error) {
      console.error('Cache setOnline error:', error.message);
    }
  }

  async setOffline(userId) {
    try {
      await redis.srem('online:users', userId.toString());
    } catch (error) {
      console.error('Cache setOffline error:', error.message);
    }
  }

  async isOnline(userId) {
    try {
      return await redis.sismember('online:users', userId.toString());
    } catch (error) {
      console.error('Cache isOnline error:', error.message);
      return false;
    }
  }

  async getOnlineUsers() {
    try {
      return await redis.smembers('online:users');
    } catch (error) {
      console.error('Cache getOnlineUsers error:', error.message);
      return [];
    }
  }

  // Rate limiting
  async checkRateLimit(key, limit = 5, window = 900) {
    try {
      const redisKey = `ratelimit:${key}`;
      const current = await redis.incr(redisKey);
      
      if (current === 1) {
        await redis.expire(redisKey, window);
      }
      
      return current <= limit;
    } catch (error) {
      console.error('Cache checkRateLimit error:', error.message);
      return true; // Allow on error
    }
  }

  // Messages cache
  async getMessages(conversationKey) {
    try {
      const cached = await redis.get(`messages:${conversationKey}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Cache getMessages error:', error.message);
      return null;
    }
  }

  async setMessages(conversationKey, messages, ttl = 1800) {
    try {
      await redis.setex(`messages:${conversationKey}`, ttl, JSON.stringify(messages));
    } catch (error) {
      console.error('Cache setMessages error:', error.message);
    }
  }

  async deleteMessages(conversationKey) {
    try {
      await redis.del(`messages:${conversationKey}`);
    } catch (error) {
      console.error('Cache deleteMessages error:', error.message);
    }
  }

  // Contacts cache
  async getContacts(userId) {
    try {
      const cached = await redis.get(`contacts:${userId}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Cache getContacts error:', error.message);
      return null;
    }
  }

  async setContacts(userId, contacts, ttl = 1800) {
    try {
      await redis.setex(`contacts:${userId}`, ttl, JSON.stringify(contacts));
    } catch (error) {
      console.error('Cache setContacts error:', error.message);
    }
  }

  async deleteContacts(userId) {
    try {
      await redis.del(`contacts:${userId}`);
    } catch (error) {
      console.error('Cache deleteContacts error:', error.message);
    }
  }

  // Channels cache
  async getChannels(userId) {
    try {
      const cached = await redis.get(`channels:${userId}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Cache getChannels error:', error.message);
      return null;
    }
  }

  async setChannels(userId, channels, ttl = 1800) {
    try {
      await redis.setex(`channels:${userId}`, ttl, JSON.stringify(channels));
    } catch (error) {
      console.error('Cache setChannels error:', error.message);
    }
  }

  async deleteChannels(userId) {
    try {
      await redis.del(`channels:${userId}`);
    } catch (error) {
      console.error('Cache deleteChannels error:', error.message);
    }
  }
}

export default new CacheService();
