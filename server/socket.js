import { Server as SocketIoServer } from "socket.io";
import Message from "./models/MessagesModel.js";
import Channel from "./models/ChannelModel.js";
import queueService from "./services/queueService.js";

export const userSocketMap = new Map();
let ioInstance = null;

const setupSocket = (server) => {
  const io = new SocketIoServer(server, {
    cors: {
      origin: process.env.ORIGIN,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  ioInstance = io;

  const disconnect = (socket) => {
    //console.log(`Client Disconnected: ${socket.id}`);
    for (const [userId, socketId] of userSocketMap.entries()) {
      if (socketId === socket.id) {
        userSocketMap.delete(userId);
        break;
      }
    }
  };

  const sendMessage = async (message) => {
    try {
   //   console.log("Message received on server:", message);
   //   console.log(message.sender);
      const senderSocketId = userSocketMap.get(message.sender);
      const recipientSocketId = userSocketMap.get(message.recipient);
    //  console.log(senderSocketId,"senderSocketId");
     // console.log(recipientSocketId,"recipientSocketId");
      // Create the message in the database
      const createdMessage = await Message.create(message);

      // Populate related fields
      const messageData = await Message.findById(createdMessage._id)
        .populate("sender", "id email firstName lastName image color")
        .populate("recipient", "id email firstName lastName image color");
        // console.log("messageDta",messageData);
      // Emit the message to the recipient and sender
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("receiveMessage", messageData);
      //  console.log("reci",messageData);
      } else {
        // Recipient is offline - queue notification
        await queueService.queueNotification({
          type: 'message',
          senderId: message.sender,
          senderName: messageData.sender?.firstName || messageData.sender?.email,
          recipientId: message.recipient,
          content: message.content,
          messageType: message.messageType
        });
      }
      if (senderSocketId) {
        io.to(senderSocketId).emit("receiveMessage", messageData);
     //   console.log("send",messageData);
      }

      // Send acknowledgment back to the sender
      
   //   if (callback) callback({ status: "success", message: "Message sent." });
    }
       catch (error) {
      console.error("Error handling sendMessage:", error);
   //   if (callback) callback({ status: "error", message: "Message sending failed." });
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
          io.to(memberSocketId).emit("recieve-channel-message", finalData);
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
    //      console.log("hhhhhmmmm");
          io.to(adminSocketId).emit("recieve-channel-message", finalData);
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
  

  io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;
    if (userId) {
      userSocketMap.set(userId, socket.id);
 //    console.log(`User connected: ${userId} with socket ID: ${socket.id}`);
    } else {
  //    console.log("User ID not provided during connection");
    }

    // Pass the data and acknowledgment callback to the sendMessage handler
    socket.on("sendMessage", (message) => sendMessage(message));
    socket.on("send-channel-message",(message)=>sendChannelMessage(message));
    socket.on("disconnect", () => disconnect(socket));
  });

  return io;
};

export const getIO = () => ioInstance;
export default setupSocket;
