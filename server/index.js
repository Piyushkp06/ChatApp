import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import cookieParser from "cookie-parser"
import mongoose from "mongoose"
import client from "prom-client"
import authRoutes from "./routes/AuthRoutes.js"
import contactsRoutes from "./routes/ContactRoutes.js"
import setupSocket, { userSocketMap, getIO } from "./socket.js"
import messagesRoutes from "./routes/MessagesRoutes.js"
import channelRoutes from "./routes/ChannelRoutes.js"
import encryptionRoutes from "./routes/EncryptionRoutes.js"
import redis from "./config/redis.js"
import rabbitmq from "./config/rabbitmq.js"
import { startNotificationWorker } from "./workers/notificationWorker.js"
import { ApiError } from "./utils/ApiError.js"

// Prometheus metrics setup
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

export const activeConnections = new client.Gauge({
  name: 'websocket_active_connections',
  help: 'Number of active WebSocket connections'
});

const authAttempts = new client.Counter({
  name: 'auth_attempts_total',
  help: 'Total authentication attempts',
  labelNames: ['type', 'status']
});

const cacheHits = new client.Counter({
  name: 'cache_hits_total',
  help: 'Total cache hits',
  labelNames: ['cache_type']
});

const cacheMisses = new client.Counter({
  name: 'cache_misses_total',
  help: 'Total cache misses',
  labelNames: ['cache_type']
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);
register.registerMetric(activeConnections);
register.registerMetric(authAttempts);
register.registerMetric(cacheHits);
register.registerMetric(cacheMisses);

export { register, authAttempts, cacheHits, cacheMisses };

dotenv.config();

const app=express();
const port=process.env.PORT || 3001;
const databaseUrl=process.env.DATABASE_URL;


app.use(
    cors({
    origin:[process.env.ORIGIN],
    methods:["GET","POST","PUT","PATCH","DELETE"],
    credentials:true,

}));

app.use("/uploads/profiles",express.static("uploads/profiles"));
app.use("/uploads/files",express.static("uploads/files"));

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Prometheus request tracking middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    httpRequestDuration.labels(req.method, route, res.statusCode).observe(duration);
    httpRequestsTotal.labels(req.method, route, res.statusCode).inc();
  });
  next();
});

// Prometheus metrics endpoint
app.get("/metrics", async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use("/api/auth",authRoutes);
app.use("/api/contacts",contactsRoutes);
app.use("/api/messages",messagesRoutes);
app.use("/api/channel",channelRoutes);
app.use("/api/encryption",encryptionRoutes);

// Health check & Redis test endpoint
app.get("/api/health", async (req, res) => {
  try {
    // Test Redis connection
    await redis.set("health:check", "ok", "EX", 10);
    const redisStatus = await redis.get("health:check");
    
    // Get all keys in Redis
    const keys = await redis.keys("*");
    
    res.json({
      status: "OK",
      timestamp: new Date().toISOString(),
      redis: {
        connected: redisStatus === "ok",
        keys: keys,
        keyCount: keys.length
      },
      rabbitmq: rabbitmq.getStatus(),
      mongodb: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
    });
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      redis: { connected: false, error: error.message },
      rabbitmq: rabbitmq.getStatus(),
      mongodb: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
    });
  }
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors
    });
  }
  
  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }
  
  // Handle duplicate key errors
  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry found'
    });
  }
  
  return res.status(500).json({
    success: false,
    message: 'Internal Server Error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const server=app.listen(port,()=>{
console.log(`Server is running at http://localhost:${port}`); 
});

const io = setupSocket(server);

mongoose
.connect(databaseUrl)
.then(()=>console.log('DB Connected Successfully'))
.catch(err=>console.log(err.message));

// Connect RabbitMQ and start workers (optional in development)
rabbitmq.connect().then((channel) => {
  if (channel) {
    startNotificationWorker();
  }
}).catch(() => {
  // Silently fail in development
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔄 Shutting down gracefully...');
  await redis.quit();
  await rabbitmq.close();
  await mongoose.connection.close();
  process.exit(0);
});
// Handle uncaught exceptions (prevent crashes)
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  console.error(err.stack);
  // Don't exit - keep server running
});

// Handle unhandled promise rejections (prevent crashes)
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  // Don't exit - keep server running
});