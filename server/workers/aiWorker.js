import rabbitmq from '../config/rabbitmq.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Message from '../models/MessagesModel.js';
import mongoose from 'mongoose';

const AI_USER_ID = process.env.AI_SYSTEM_ID || "649e8c5a3c2d3a1b9a5f4e2a";

export const startAIWorker = async (io, userSocketMap) => {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  await rabbitmq.consume('ai-queue', async (message) => {
    console.log('🤖 Processing AI request:', message.content?.substring(0, 50));

    const { userId, content } = message;

    try {
      // Generate AI response
      const result = await model.generateContent(content);
      let aiResponseContent = result?.response?.text;

      if (typeof aiResponseContent === 'function') {
        aiResponseContent = aiResponseContent();
      }

      if (!aiResponseContent || typeof aiResponseContent !== 'string') {
        aiResponseContent = "Sorry, I couldn't process that.";
      }

      // Save user message
      const userMessage = await Message.create({
        sender: new mongoose.Types.ObjectId(userId),
        recipient: new mongoose.Types.ObjectId(AI_USER_ID),
        content,
        messageType: "text",
        timestamp: Date.now(),
      });

      // Save AI response
      const aiMessage = await Message.create({
        sender: new mongoose.Types.ObjectId(AI_USER_ID),
        recipient: new mongoose.Types.ObjectId(userId),
        content: aiResponseContent,
        messageType: "text",
        timestamp: Date.now(),
      });

      // Populate messages for socket emission
      const populatedUserMsg = await Message.findById(userMessage._id)
        .populate("sender", "id email firstName lastName image color")
        .populate("recipient", "id email firstName lastName image color");

      const populatedAiMsg = await Message.findById(aiMessage._id)
        .populate("sender", "id email firstName lastName image color")
        .populate("recipient", "id email firstName lastName image color");

      // Send to user via socket if online
      if (io && userSocketMap) {
        const userSocketId = userSocketMap.get(userId);
        if (userSocketId) {
          io.to(userSocketId).emit("ai-response", {
            userMessage: populatedUserMsg,
            aiMessage: populatedAiMsg
          });
          console.log(`✅ AI response sent to user ${userId}`);
        }
      }

    } catch (error) {
      console.error('❌ AI Worker error:', error.message);
    }
  });
};
