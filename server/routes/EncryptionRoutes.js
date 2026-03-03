import { Router } from "express";
import { 
  updatePublicKey, 
  getPublicKey, 
  getPublicKeys, 
  getMyPublicKey 
} from "../controllers/EncryptionController.js";
import { verifyToken } from "../middlewares/AuthMiddleware.js";

const encryptionRoutes = Router();

// Update current user's public key
encryptionRoutes.post("/update-public-key", verifyToken, updatePublicKey);

// Get current user's public key
encryptionRoutes.get("/my-public-key", verifyToken, getMyPublicKey);

// Get a specific user's public key
encryptionRoutes.get("/public-key/:userId", verifyToken, getPublicKey);

// Get multiple users' public keys
encryptionRoutes.post("/public-keys", verifyToken, getPublicKeys);

export default encryptionRoutes;
