import { Server as SocketIoServer } from "socket.io";
import Message from "./models/MessagesModel.js";

const setupSocket = (server) => {
  const io = new SocketIoServer(server, {
    cors: {
      origin: process.env.ORIGIN,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  const userSocketMap = new Map();

  const disconnect = (socket) => {
    console.log(`Client Disconnected: ${socket.id}`);
    for (const [userId, socketId] of userSocketMap.entries()) {
      if (socketId === socket.id) {
        userSocketMap.delete(userId);
        break;
      }
    }
  };

  const sendMessage = async (message, callback) => {
    try {
      console.log("Message received on server:", message);
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
      }
      if (senderSocketId) {
        io.to(senderSocketId).emit("receiveMessage", messageData);
     //   console.log("send",messageData);
      }

      // Send acknowledgment back to the sender
      if (callback) callback({ status: "success", message: "Message sent." });
    } catch (error) {
      console.error("Error handling sendMessage:", error);
      if (callback) callback({ status: "error", message: "Message sending failed." });
    }
  };

  io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;
    if (userId) {
      userSocketMap.set(userId, socket.id);
    //  console.log(`User connected: ${userId} with socket ID: ${socket.id}`);
    } else {
    //  console.log("User ID not provided during connection");
    }

    // Pass the data and acknowledgment callback to the sendMessage handler
    socket.on("sendMessage", (message, callback) => sendMessage(message, callback));
    socket.on("disconnect", () => disconnect(socket));
  });
};

export default setupSocket;
