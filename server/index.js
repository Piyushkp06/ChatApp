import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import cookieParser from "cookie-parser"
import mongoose from "mongoose"
import authRoutes from "./routes/AuthRoutes.js"
import contactsRoutes from "./routes/ContactRoutes.js"
import setupSocket, { userSocketMap, getIO } from "./socket.js"
import messagesRoutes from "./routes/MessagesRoutes.js"
import channelRoutes from "./routes/ChannelRoutes.js"
import redis from "./config/redis.js"
import rabbitmq from "./config/rabbitmq.js"
import { startNotificationWorker } from "./workers/notificationWorker.js"
import { ApiError } from "./utils/ApiError.js"

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

app.use("/api/auth",authRoutes);
app.use("/api/contacts",contactsRoutes);
app.use("/api/messages",messagesRoutes);
app.use("/api/channel",channelRoutes);

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
