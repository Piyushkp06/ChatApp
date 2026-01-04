import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Message from "../models/MessagesModel.js";
import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import queueService from "../services/queueService.js";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Generate AI Response - Async via RabbitMQ
export const generateAIResponse = async (req, res, next) => {
  const { content } = req.body;

  if (!content) {
    throw new ApiError(400, "Content is required.");
  }

  try {
    const userId = req.userId;

    // Queue AI request for background processing
    const queued = await queueService.queueAIRequest({
      userId,
      content
    });

    if (queued) {
      return res.status(202).json({ 
        message: "AI request queued. Response will be sent via socket.",
        status: "processing"
      });
    } else {
      // Fallback to synchronous if queue fails
      return await generateAIResponseSync(req, res, next);
    }

  } catch (error) {
    console.error("Error queuing AI request:", error);
    return res.status(500).send("Internal Server Error");
  }
};

// Synchronous fallback (if RabbitMQ is down)
const generateAIResponseSync = async (req, res, next) => {
  const { content } = req.body;
  const userId = req.userId;

  try {
    const result = await model.generateContent(content);
    let aiResponseContent = result?.response?.text;

    if (typeof aiResponseContent === 'function') {
      aiResponseContent = aiResponseContent();
    }

    if (!aiResponseContent || typeof aiResponseContent !== 'string') {
      aiResponseContent = "Sorry, I couldn't process that.";
    }

    const userMessage = new Message({
      sender: userId,
      recipient: new mongoose.Types.ObjectId("649e8c5a3c2d3a1b9a5f4e2a"),
      content,
      messageType: "text",
      timestamp: Date.now(),
    });

    const aiMessage = new Message({
      sender: new mongoose.Types.ObjectId("649e8c5a3c2d3a1b9a5f4e2a"),
      recipient: userId,
      content: aiResponseContent,
      messageType: "text",
      timestamp: Date.now(),
    });

    await userMessage.save();
    await aiMessage.save();

    return res.status(200).json({ userMessage, aiMessage });

  } catch (error) {
    console.error("Error generating AI response:", error);
    return res.status(500).send("Internal Server Error");
  }
};
