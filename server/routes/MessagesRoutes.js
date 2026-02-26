import {Router} from "express";
import {verifyToken} from "../middlewares/AuthMiddleware.js"
import { getMessages, uploadFile, getUnreadCounts, markAsRead, getUserStatus } from "../controllers/MessagesController.js";
import multer from "multer";


const messagesRoutes = Router();

const upload =multer({dest:"uploads/files"})

messagesRoutes.post("/get-messages",verifyToken,getMessages);
messagesRoutes.post("/upload-file",verifyToken,upload.single("file"),uploadFile);
messagesRoutes.get("/unread-counts",verifyToken,getUnreadCounts);
messagesRoutes.post("/mark-as-read",verifyToken,markAsRead);
messagesRoutes.get("/user-status/:userId",verifyToken,getUserStatus);

export default messagesRoutes;