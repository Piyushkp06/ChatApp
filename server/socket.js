import { Server as SocketIoServer } from "socket.io";
import Message from "./models/MessagesModel.js";
import Channel from "./models/ChannelModel.js";
import queueService from "./services/queueService.js";
import cacheService from "./services/cacheService.js";
import dotenv from "dotenv";

dotenv.config();

// AI System User ID
const AI_SYSTEM_ID = process.env.AI_SYSTEM_ID || "649e8c5a3c2d3a1b9a5f4e2a";
const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || "http://localhost:8000";

export const userSocketMap = new Map();
let ioInstance = null;

// Handle AI message by calling Python backend
const handleAIMessage = async (message, io) => {
  const senderSocketId = userSocketMap.get(message.sender);
  
  try {
    // Call Python backend for AI response
    const response = await fetch(`${PYTHON_BACKEND_URL}/api/ai/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: message.content,
        userId: message.sender
      })
    });
    
    if (!response.ok) {
      throw new Error(`Python backend error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Send both messages to the user
    if (senderSocketId) {
      io.to(senderSocketId).emit("ai-response", {
        userMessage: data.userMessage,
        aiMessage: data.aiMessage
      });
      console.log(`✅ AI response sent to user ${message.sender}`);
    }
  } catch (error) {
    console.error("❌ Error calling Python AI backend:", error.message);
    
    // Send error message back to user
    if (senderSocketId) {
      io.to(senderSocketId).emit("ai-error", {
        error: "Failed to get AI response. Please try again."
      });
    }
  }
};

const setupSocket = (server) => {
  const io = new SocketIoServer(server, {
    cors: {
      origin: process.env.ORIGIN,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  ioInstance = io;

  const disconnect = async (socket) => {
    for (const [userId, socketId] of userSocketMap.entries()) {
      if (socketId === socket.id) {
        userSocketMap.delete(userId);
        // Track user going offline
        await cacheService.setOffline(userId);
        await cacheService.setLastSeen(userId);
        console.log(`User ${userId} disconnected`);
        break;
      }
    }
  };

  const sendMessage = async (message) => {
    try {
      // Check if message is being sent to AI
      if (message.recipient === AI_SYSTEM_ID) {
        return await handleAIMessage(message, io);
      }
      
      const senderSocketId = userSocketMap.get(message.sender);
      const recipientSocketId = userSocketMap.get(message.recipient);
      // Create the message in the database
      const createdMessage = await Message.create(message);

      // Populate related fields including replyTo
      const messageData = await Message.findById(createdMessage._id)
        .populate("sender", "id email firstName lastName image color")
        .populate("recipient", "id email firstName lastName image color")
        .populate({
          path: "replyTo",
          populate: {
            path: "sender",
            select: "id email firstName lastName"
          }
        });
      
      // Emit the message to the recipient and sender
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("receiveMessage", messageData);
      } else {
        // Recipient is offline - queue notification and track unread
        await queueService.queueNotification({
          type: 'message',
          senderId: message.sender,
          senderName: messageData.sender?.firstName || messageData.sender?.email,
          recipientId: message.recipient,
          content: message.content,
          messageType: message.messageType
        });
        
        // Track unread message count
        await cacheService.incrementUnread(message.recipient, message.sender);
      }
      if (senderSocketId) {
        io.to(senderSocketId).emit("receiveMessage", messageData);
      }
    } catch (error) {
      console.error("Error handling sendMessage:", error);
    }
      
  };

  const sendChannelMessage = async (message) => {
    const { channelId, sender, content, messageType, fileUrl } = message;
     
    const createdMessage = await Message.create({
      sender,
      recipient: null,
      content,
      messageType,
      timestamp: new Date(),
      fileUrl,
      channelId,
    });
  
    const messageData = await Message.findById(createdMessage._id)
      .populate("sender", "id email firstName lastName image color")
      .exec();
  
    await Channel.findByIdAndUpdate(channelId, {
      $push: { messages: createdMessage._id },
    });
  
    const channel = await Channel.findById(channelId).populate("members");
  
    const finalData = messageData._doc;

    if (channel && channel.members) {
      channel.members.forEach(async (member) => {
        const memberSocketId = userSocketMap.get(member._id.toString());
        if (memberSocketId) {
          io.to(memberSocketId).emit("receive-channel-message", finalData);
        } else if (member._id.toString() !== sender) {
          // Member is offline - queue notification
          await queueService.queueNotification({
            type: 'channel-message',
            senderId: sender,
            senderName: messageData.sender?.firstName || messageData.sender?.email,
            recipientId: member._id.toString(),
            content,
            messageType,
            channelId,
            channelName: channel.name
          });
        }
      });
      const adminSocketId = userSocketMap.get(channel.admin._id?.toString());
    //  console.log("userSocketMap:", userSocketMap);
  //    console.log("Looking for Admin Socket:", channel.admin._id?.toString());
      console.log(finalData);
        if (adminSocketId) {
          io.to(adminSocketId).emit("receive-channel-message", finalData);
        } else if (channel.admin._id?.toString() !== sender) {
          // Admin is offline - queue notification
          await queueService.queueNotification({
            type: 'channel-message',
            senderId: sender,
            senderName: messageData.sender?.firstName || messageData.sender?.email,
            recipientId: channel.admin._id?.toString(),
            content,
            messageType,
            channelId,
            channelName: channel.name
          });
        }
    }
    
  };

  // Delete message for me only
  const deleteMessageForMe = async (data) => {
    try {
      const { messageId, userId } = data;
      
      await Message.findByIdAndUpdate(messageId, {
        $addToSet: { deletedFor: userId }
      });
      
      const userSocketId = userSocketMap.get(userId);
      if (userSocketId) {
        io.to(userSocketId).emit("messageDeletedForMe", { messageId });
      }
    } catch (error) {
      console.error("Error deleting message for me:", error);
    }
  };

  // Delete message for everyone
  const deleteMessageForEveryone = async (data) => {
    try {
      const { messageId, senderId, recipientId, channelId } = data;
      
      const message = await Message.findById(messageId);
      if (!message) return;
      
      // Only the sender can delete for everyone
      if (message.sender.toString() !== senderId) {
        console.log("Only sender can delete for everyone");
        return;
      }
      
      await Message.findByIdAndUpdate(messageId, {
        deletedForEveryone: true,
        content: "This message was deleted"
      });
      
      // Notify all participants
      if (channelId) {
        // Channel message - notify all members
        const channel = await Channel.findById(channelId).populate("members");
        if (channel) {
          channel.members.forEach((member) => {
            const memberSocketId = userSocketMap.get(member._id.toString());
            if (memberSocketId) {
              io.to(memberSocketId).emit("messageDeletedForEveryone", { messageId, channelId });
            }
          });
          const adminSocketId = userSocketMap.get(channel.admin.toString());
          if (adminSocketId) {
            io.to(adminSocketId).emit("messageDeletedForEveryone", { messageId, channelId });
          }
        }
      } else {
        // DM - notify both sender and recipient
        const senderSocketId = userSocketMap.get(senderId);
        const recipientSocketId = userSocketMap.get(recipientId);
        
        if (senderSocketId) {
          io.to(senderSocketId).emit("messageDeletedForEveryone", { messageId });
        }
        if (recipientSocketId) {
          io.to(recipientSocketId).emit("messageDeletedForEveryone", { messageId });
        }
      }
    } catch (error) {
      console.error("Error deleting message for everyone:", error);
    }
  };

  // Mark view once message as viewed
  const markViewOnceViewed = async (data) => {
    try {
      const { messageId, viewerId } = data;
      
      const message = await Message.findById(messageId);
      if (!message || !message.viewOnce) return;
      
      // Check if already viewed by this user
      if (message.viewedBy.includes(viewerId)) {
        return;
      }
      
      await Message.findByIdAndUpdate(messageId, {
        $addToSet: { viewedBy: viewerId }
      });
      
      // Notify the sender that the message was viewed
      const senderSocketId = userSocketMap.get(message.sender.toString());
      if (senderSocketId) {
        io.to(senderSocketId).emit("viewOnceViewed", { 
          messageId, 
          viewerId 
        });
      }
    } catch (error) {
      console.error("Error marking view once as viewed:", error);
    }
  };
  

  io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;
    if (userId) {
      userSocketMap.set(userId, socket.id);
      // Track user coming online
      cacheService.setOnline(userId);
    }

    // Pass the data and acknowledgment callback to the sendMessage handler
    socket.on("sendMessage", (message) => sendMessage(message));
    socket.on("send-channel-message",(message)=>sendChannelMessage(message));
    socket.on("deleteMessageForMe", (data) => deleteMessageForMe(data));
    socket.on("deleteMessageForEveryone", (data) => deleteMessageForEveryone(data));
    socket.on("markViewOnceViewed", (data) => markViewOnceViewed(data));
    
    // Voice/Video Call Signaling Events
    socket.on("call-user", ({ to, offer, callType, callerInfo }) => {
      const recipientSocketId = userSocketMap.get(to);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("incoming-call", {
          from: userId,
          offer,
          callType,
          callerInfo
        });
        console.log(`📞 ${callType} call from ${userId} to ${to}`);
      } else {
        // User is offline
        socket.emit("call-unavailable", { reason: "User is offline" });
      }
    });

    socket.on("call-accepted", ({ to, answer }) => {
      const callerSocketId = userSocketMap.get(to);
      if (callerSocketId) {
        io.to(callerSocketId).emit("call-accepted", { answer });
        console.log(`✅ Call accepted by ${userId}`);
      }
    });

    socket.on("call-rejected", ({ to, reason }) => {
      const callerSocketId = userSocketMap.get(to);
      if (callerSocketId) {
        io.to(callerSocketId).emit("call-rejected", { reason });
        console.log(`❌ Call rejected by ${userId}`);
      }
    });

    socket.on("ice-candidate", ({ to, candidate }) => {
      const recipientSocketId = userSocketMap.get(to);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("ice-candidate", { candidate, from: userId });
      }
    });

    socket.on("end-call", ({ to }) => {
      const recipientSocketId = userSocketMap.get(to);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("call-ended", { from: userId });
        console.log(`📴 Call ended between ${userId} and ${to}`);
      }
    });

    socket.on("toggle-media", ({ to, mediaType, enabled }) => {
      const recipientSocketId = userSocketMap.get(to);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("remote-media-toggle", { 
          mediaType, 
          enabled,
          from: userId 
        });
      }
    });

    socket.on("disconnect", () => disconnect(socket));
  });

  return io;
};

export const getIO = () => ioInstance;
export default setupSocket;
