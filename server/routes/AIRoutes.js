import { Router } from "express";
import { generateAIResponse } from "../controllers/AIController.js";
import { verifyToken } from "../middlewares/AuthMiddleware.js";

const aiRoutes=Router();

aiRoutes.post("/generate",verifyToken,generateAIResponse);

export default aiRoutes;
