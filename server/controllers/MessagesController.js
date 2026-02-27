import Message from "../models/MessagesModel.js";
import {mkdirSync,renameSync} from "fs"
import cacheService from "../services/cacheService.js";

export const getMessages = async (request, response, next) => {
  const user1 = request.userId;
  const user2 = request.body.id;

  if (!user1 || !user2) {
    return response.status(400).send("Both user ID's are required.");
  }
  try {
    const messages = await Message.find({
      $or: [
        { sender: user1, recipient: user2 },
        { sender: user2, recipient: user1 }
      ]
    }).sort({ timestamp: 1 });

    return response.status(200).json({ messages });
  } catch (error) {
    console.log(error);
    return response.status(500).send("Internal Server Error");
  }
};

export const uploadFile = async (request, response, next) => {
 try{
  if (!request.file) {
    return response.status(400).send("File is required");
  }
  
  // Sanitize filename to prevent path traversal attacks
  const sanitizedFilename = request.file.originalname
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.\./g, '_');
  
  const date = Date.now();
  let fileDir = `uploads/files/${date}`;
  let fileName = `${fileDir}/${sanitizedFilename}`;
  
  mkdirSync(fileDir, { recursive: true });
  
  renameSync(request.file.path, fileName);
  
  return response.status(200).json({ filePath: fileName });
  
  } catch (error) {
    console.log(error);
    return response.status(500).send("Internal Server Error");
  }
};

// Get unread message counts per conversation
export const getUnreadCounts = async (request, response, next) => {
  try {
    const userId = request.userId;
    const unreadCounts = await cacheService.getUnreadCounts(userId);
    const totalUnread = await cacheService.getTotalUnreadCount(userId);
    
    return response.status(200).json({ 
      unreadCounts,
      totalUnread
    });
  } catch (error) {
    console.error('Get unread counts error:', error);
    return response.status(500).json({ message: "Failed to get unread counts" });
  }
};

// Mark messages from a contact as read
export const markAsRead = async (request, response, next) => {
  try {
    const userId = request.userId;
    const { contactId } = request.body;
    
    if (!contactId) {
      return response.status(400).json({ message: "contactId is required" });
    }
    
    await cacheService.clearUnread(userId, contactId);
    
    return response.status(200).json({ success: true });
  } catch (error) {
    console.error('Mark as read error:', error);
    return response.status(500).json({ message: "Failed to mark as read" });
  }
};

// Get user online status and last seen
export const getUserStatus = async (request, response, next) => {
  try {
    const { userId } = request.params;
    
    if (!userId) {
      return response.status(400).json({ message: "userId is required" });
    }
    
    // Try Redis first
    let isOnline = await cacheService.isOnline(userId);
    const lastSeen = await cacheService.getLastSeen(userId);
    
    // Fallback to socket map if Redis returned false (might be unavailable)
    if (!isOnline) {
      const { userSocketMap } = await import('../socket.js');
      isOnline = userSocketMap.has(userId);
    }
    
    return response.status(200).json({ 
      userId,
      online: isOnline,
      lastSeen: lastSeen ? new Date(lastSeen).toISOString() : null
    });
  } catch (error) {
    console.error('Get user status error:', error);
    return response.status(500).json({ message: "Failed to get user status" });
  }
};