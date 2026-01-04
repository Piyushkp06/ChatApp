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
import aiRoutes from "./routes/AIRoutes.js"
import redis from "./config/redis.js"
import rabbitmq from "./config/rabbitmq.js"
import { startAIWorker } from "./workers/aiWorker.js"
import { startNotificationWorker } from "./workers/notificationWorker.js"

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
app.use(express.json());

app.use("/api/auth",authRoutes);
app.use("/api/contacts",contactsRoutes);
app.use("/api/messages",messagesRoutes);
app.use("/api/channel",channelRoutes);
app.use("/api/ai",aiRoutes);

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


const server=app.listen(port,()=>{
console.log(`Sever is running at http://localhost:${port}`); 
});

const io = setupSocket(server);

mongoose
.connect(databaseUrl)
.then(()=>console.log('DB Connected Successfully'))
.catch(err=>console.log(err.message));

// Connect RabbitMQ and start workers
rabbitmq.connect().then(() => {
  startAIWorker(io, userSocketMap);
  startNotificationWorker();
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔄 Shutting down gracefully...');
  await redis.quit();
  await rabbitmq.close();
  await mongoose.connection.close();
  process.exit(0);
});
