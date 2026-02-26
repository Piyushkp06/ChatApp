import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times) => {
    // Only retry 3 times, then give up
    if (times > 3) {
      console.log('⚠️  Redis unavailable - running without cache');
      return null; // Stop retrying
    }
    return Math.min(times * 50, 2000);
  },
  maxRetriesPerRequest: 3,
  lazyConnect: true, // Don't connect immediately
});

redis.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

redis.on('error', (err) => {
  // Suppress repetitive error messages
  if (!redis.errorLogged) {
    console.log('⚠️  Redis unavailable - running without cache');
    redis.errorLogged = true;
  }
});

// Try to connect
redis.connect().catch(() => {
  console.log('⚠️  Redis not available - continuing without cache');
});

export default redis;
