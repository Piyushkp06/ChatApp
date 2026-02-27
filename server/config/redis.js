import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';

dotenv.config();

let redis = null;
let isConnected = false;

try {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (url && token) {
    redis = new Redis({
      url: url,
      token: token,
    });
    isConnected = true;
    console.log('✅ Upstash Redis connected successfully');
  } else {
    console.log('⚠️  Upstash Redis credentials not found - running without cache');
  }
} catch (error) {
  console.log('⚠️  Redis unavailable - running without cache');
  isConnected = false;
}

export const isRedisConnected = () => isConnected;
export default redis;
