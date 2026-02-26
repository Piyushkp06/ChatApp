import { useAppStore } from "@/store";
import { HOST } from "@/utils/constants";
import { createContext, useContext, useEffect, useRef } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const socket = useRef(null); // Persist the socket reference
  const userInfo = useAppStore(); // Access user info from the store

  useEffect(() => {
 //   console.log("userInfo:", userInfo);

    if (userInfo && userInfo?.userInfo?.id) {
      // Prevent multiple socket connections
      if (!socket.current) {
        socket.current = io(HOST, {
          withCredentials: true,
          query: { userId: userInfo?.userInfo?.id },
        });

        socket.current.on("connect", () => {
      //    console.log("Connected to socket server");
        });

        socket.current.on("receiveMessage", async (message) => {
          const { 
            selectedChatData, 
            selectedChatType, 
            addMessage, 
            addContactsInDMContacts 
          } = useAppStore.getState();
        
          console.log("Received message:", message);
        
          // Check if the message is being sent TO the AI (user's message to AI)
          if (message.recipient._id === "649e8c5a3c2d3a1b9a5f4e2a") {
            // This is the user's message to AI - just add it to chat
            // The AI response will come via "ai-response" event
            if (
              selectedChatType !== undefined &&
              (selectedChatData._id === message.sender._id || selectedChatData._id === message.recipient._id)
            ) {
              const messageExists = selectedChatData.messages?.some(
                (msg) => msg._id === message._id
              );
          
              if (!messageExists) {
                addMessage(message);
                console.log("User message to AI added to chat:", message);
              }
            }
            addContactsInDMContacts(message);
            return; // Don't process further
          }
        
          // Handle normal messages (not AI-related)
          if (
            selectedChatType !== undefined &&
            (selectedChatData._id === message.sender._id || selectedChatData._id === message.recipient._id)
          ) {
            const messageExists = selectedChatData.messages?.some(
              (msg) => msg._id === message._id
            );
        
            if (!messageExists) {
              addMessage(message);
              console.log("Normal message added to chat:", message);
            } else {
              console.log("Message already exists in chat:", message);
            }
          }
        
          addContactsInDMContacts(message);
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
        
        

        socket.current.on("recieve-channel-message",(message)=>{
         
          const { selectedChatData, selectedChatType, addMessage,addChannelInChannelList} = useAppStore.getState();

      if (
        selectedChatType !== undefined &&
        selectedChatData._id === message.channelId
      ) {
        addMessage(message);
      }
      addChannelInChannelList(message);
        })

     /*   socket.current.on("disconnect", () => {
          console.log("Disconnected from socket server");
        });*/
      } 

      // Cleanup function to properly disconnect the socket and remove listeners
      return () => {
        if (socket.current) {
          socket.current.disconnect(); // Disconnect the socket
          socket.current = null; // Reset the socket reference
        }
      };
    }
  }, [userInfo?.userInfo?.id]); // Dependency on userInfo

  return (
    <SocketContext.Provider value={socket.current}>
      {children}
    </SocketContext.Provider>
  );
};
