import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Message from "../models/MessagesModel.js";
import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";  // Assuming you have this error handling class

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Generate AI Response
export const generateAIResponse = async (req, res, next) => {
  const { content } = req.body;

  if (!content) {
    throw new ApiError(400, "Content is required.");
  }

  try {
    const userId = req.userId;

    // Generate AI response
    const result = await model.generateContent(content);

    // Log the raw result for debugging purposes
    console.log("Raw AI Response:", result);

    // Extract the AI's response content, which could be a function
    let aiResponseContent = result?.response?.text;

    // If the response is a function, attempt to evaluate it
    if (typeof aiResponseContent === 'function') {
      try {
        aiResponseContent = aiResponseContent();  // Evaluate the function to get the response text
      } catch (error) {
        console.error("Error evaluating AI response function:", error);
        aiResponseContent = "Sorry, I couldn't process that.";
      }
    }

    // If the response is not valid, provide a fallback
    if (!aiResponseContent || typeof aiResponseContent !== 'string') {
      aiResponseContent = "Sorry, I couldn't process that.";
    }

    // Save the user's message
    const userMessage = new Message({
      sender: userId,
      recipient: new mongoose.Types.ObjectId("649e8c5a3c2d3a1b9a5f4e2a"),  // AI's ID
      content,
      messageType: "text",
      timestamp: Date.now(),
    });

    // Save the AI's message
    const aiMessage = new Message({
      sender: new mongoose.Types.ObjectId("649e8c5a3c2d3a1b9a5f4e2a"),  // AI's ID
      recipient: userId,
      content: aiResponseContent,
      messageType: "text",
      timestamp: Date.now(),
    });

    // Save both messages to the database
    await userMessage.save();
    await aiMessage.save();

    // Return the messages in the response
    return res.status(200).json({ userMessage, aiMessage });

  } catch (error) {
    // Log the error for debugging purposes
    console.error("Error generating AI response:", error);

    // Send a generic error message
    return res.status(500).send("Internal Server Error");
  }
};
