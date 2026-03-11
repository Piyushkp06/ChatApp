import { useAppStore } from "@/store";
import { HOST } from "@/utils/constants";
import { createContext, useContext, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { sessionManager } from "@/utils/ratchetSession";
import { initSodium } from "@/utils/crypto";

const SocketContext = createContext(null);

export const useSocket = () => {
  return useContext(SocketContext);
};

// Helper function to decrypt messages
const decryptMessageContent = async (message, senderId) => {
  try {
    if (!message.encrypted || !message.encryptedContent) {
      return message;
    }

    // Initialize sodium if needed
    await initSodium();

    // Check if we have a session with this sender
    if (!sessionManager.hasInitializedSession(senderId)) {
      // Try to establish session with sender's public key
      if (message.senderPublicKey) {
        const { acceptSession, setContactPublicKey } = useAppStore.getState();
        setContactPublicKey(senderId, message.senderPublicKey);
        
        // Initialize session as responder
        await sessionManager.acceptSession(
          senderId,
          message.senderPublicKey,
          message.encryptedContent.publicKey
        );
      } else {
        console.warn('Cannot decrypt: no session and no sender public key');
        return { ...message, content: '[Unable to decrypt - no session]' };
      }
    }

    // Decrypt the message
    const decryptedContent = await sessionManager.decrypt(senderId, message.encryptedContent);
    
    return {
      ...message,
      content: decryptedContent,
      decrypted: true,
    };
  } catch (error) {
    console.error('Failed to decrypt message:', error);
    return { ...message, content: '[Decryption failed]', decryptionError: true };
  }
};

export const SocketProvider = ({ children }) => {
  const socket = useRef(null); // Persist the socket reference
  const { userInfo } = useAppStore(); // Correctly destructure userInfo from store

  useEffect(() => {
    // Check if userInfo exists and has an id
    const userId = userInfo?.id;
    
    if (userId) {
      // Prevent multiple socket connections
      if (!socket.current || socket.current.disconnected) {
        socket.current = io(HOST, {
          withCredentials: true,
          query: { userId },
        });

        socket.current.on("connect", () => {
          console.log("Connected to socket server");
        });

        socket.current.on("receiveMessage", async (message) => {
          const { 
            selectedChatData, 
            selectedChatType, 
            addMessage, 
            addContactsInDMContacts,
            unreadCounts,
            setUnreadCounts,
            setTotalUnread
          } = useAppStore.getState();
        
          console.log("Received message:", message);
          
          // Get the sender ID for unread tracking
          const senderId = message.sender._id || message.sender;

          // Decrypt encrypted messages
          let processedMessage = message;
          if (message.encrypted && message.encryptedContent) {
            processedMessage = await decryptMessageContent(message, senderId);
            console.log("Decrypted message:", processedMessage);
          }
        
          // Check if the message is being sent TO the AI (user's message to AI)
          if (processedMessage.recipient._id === "649e8c5a3c2d3a1b9a5f4e2a") {
            // This is the user's message to AI - just add it to chat
            // The AI response will come via "ai-response" event
            if (
              selectedChatType !== undefined &&
              (selectedChatData._id === processedMessage.sender._id || selectedChatData._id === processedMessage.recipient._id)
            ) {
              const messageExists = selectedChatData.messages?.some(
                (msg) => msg._id === processedMessage._id
              );
          
              if (!messageExists) {
                addMessage(processedMessage);
                console.log("User message to AI added to chat:", processedMessage);
              }
            }
            addContactsInDMContacts(processedMessage);
            return; // Don't process further
          }
        
          // Handle normal messages (not AI-related)
          const isCurrentChat = selectedChatType !== undefined &&
            (selectedChatData._id === processedMessage.sender._id || selectedChatData._id === processedMessage.recipient._id);
          
          if (isCurrentChat) {
            const messageExists = selectedChatData.messages?.some(
              (msg) => msg._id === processedMessage._id
            );
        
            if (!messageExists) {
              addMessage(processedMessage);
              console.log("Normal message added to chat:", processedMessage);
            } else {
              console.log("Message already exists in chat:", processedMessage);
            }
          } else {
            // Message is from a different chat - increment unread count
            const newUnreadCounts = { ...unreadCounts };
            newUnreadCounts[senderId] = (parseInt(newUnreadCounts[senderId]) || 0) + 1;
            setUnreadCounts(newUnreadCounts);
            const newTotal = Object.values(newUnreadCounts).reduce((sum, count) => sum + parseInt(count), 0);
            setTotalUnread(newTotal);
            console.log("Incremented unread count for:", senderId);
          }
        
          addContactsInDMContacts(processedMessage);
        });

        // Listen for AI responses (from RabbitMQ worker)
        socket.current.on("ai-response", (data) => {
          const { selectedChatData, selectedChatType, addMessage } = useAppStore.getState();
          
          console.log("AI Response received:", data);
          
          const { userMessage, aiMessage } = data;
          
          // Add both user message and AI response if they don't exist
          if (
            selectedChatType !== undefined &&
            (selectedChatData._id === userMessage?.sender?._id || 
             selectedChatData._id === userMessage?.recipient?._id ||
             selectedChatData._id === "649e8c5a3c2d3a1b9a5f4e2a")
          ) {
            // Add user message if not exists
            if (userMessage) {
              const userMessageExists = selectedChatData.messages?.some(
                (msg) => msg._id === userMessage._id
              );
              if (!userMessageExists) {
                addMessage(userMessage);
                console.log("User message to AI added:", userMessage);
              }
            }
            
            // Add AI response
            if (aiMessage) {
              const aiMessageExists = selectedChatData.messages?.some(
                (msg) => msg._id === aiMessage._id
              );
              if (!aiMessageExists) {
                addMessage(aiMessage);
                console.log("AI response added:", aiMessage);
              }
            }
          }
        });
        
        

        socket.current.on("receive-channel-message",(message)=>{
          const { 
            selectedChatData, 
            selectedChatType, 
            addMessage, 
            addChannelInChannelList,
            unreadCounts,
            setUnreadCounts,
            setTotalUnread
          } = useAppStore.getState();

          const isCurrentChannel = selectedChatType !== undefined && selectedChatData._id === message.channelId;
          
          if (isCurrentChannel) {
            addMessage(message);
          } else {
            // Channel message received but not in current view - increment unread
            const newUnreadCounts = { ...unreadCounts };
            newUnreadCounts[message.channelId] = (parseInt(newUnreadCounts[message.channelId]) || 0) + 1;
            setUnreadCounts(newUnreadCounts);
            const newTotal = Object.values(newUnreadCounts).reduce((sum, count) => sum + parseInt(count), 0);
            setTotalUnread(newTotal);
          }
          addChannelInChannelList(message);
        })

        // Listen for message deletion events
        socket.current.on("messageDeletedForMe", ({ messageId }) => {
          const { deleteMessageForMe } = useAppStore.getState();
          deleteMessageForMe(messageId);
        });

        socket.current.on("messageDeletedForEveryone", ({ messageId }) => {
          const { deleteMessageForEveryone } = useAppStore.getState();
          deleteMessageForEveryone(messageId);
        });

        // Listen for view once viewed events
        socket.current.on("viewOnceViewed", ({ messageId, viewerId }) => {
          const { markViewOnceAsViewed } = useAppStore.getState();
          markViewOnceAsViewed(messageId, viewerId);
        });

        // Listen for incoming voice/video calls
        socket.current.on("incoming-call", (data) => {
          const { receiveIncomingCall } = useAppStore.getState();
          console.log("📞 Incoming call:", data);
          receiveIncomingCall(data);
        });
      } 

      // Cleanup function to properly disconnect the socket and remove listeners
      return () => {
        if (socket.current) {
          socket.current.disconnect(); // Disconnect the socket
          socket.current = null; // Reset the socket reference
        }
      };
    }
  }, [userInfo?.id]); // Dependency on userInfo.id

  return (
    <SocketContext.Provider value={socket.current}>
      {children}
    </SocketContext.Provider>
  );
};
