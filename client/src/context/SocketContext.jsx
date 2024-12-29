import { useAppStore } from "@/store";
import { GET_AI_RESPONSE_ROUTE, HOST } from "@/utils/constants";
import { createContext, useContext, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import apiClient from "../lib/api-client";

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
        
          // Track if the AI message has been handled
          let messageHandled = false;
        
          // Check if the message recipient is the AI
          if (message.recipient._id === "649e8c5a3c2d3a1b9a5f4e2a") {
            try {
              const response = await apiClient.post(
                GET_AI_RESPONSE_ROUTE,
                { content: message.content },
                { withCredentials: true, headers: { "Content-Type": "application/json" } }
              );
          
              console.log("AI Response:", response.data);
          
              const { userMessage, aiMessage } = response.data;
          
              // Deduplication for userMessage
              if (userMessage) {
                const userMessageExists = selectedChatData.messages?.some(
                  (msg) => msg._id === userMessage._id
                );
          
                if (!userMessageExists) {
                  addMessage(userMessage);
                  console.log("User message added to chat:", userMessage);
                } else {
                  console.log("User message already exists in chat:", userMessage);
                }
              }
          
              // Deduplication for aiMessage
              if (aiMessage) {
                const aiMessageExists = selectedChatData.messages?.some(
                  (msg) => msg._id === aiMessage._id
                );
          
                if (!aiMessageExists) {
                  addMessage(aiMessage);
                  console.log("AI message added to chat:", aiMessage);
                } else {
                  console.log("AI message already exists in chat:", aiMessage);
                }
              } else {
                console.error("AI response is invalid or empty");
              }
          
              messageHandled = true;
            } catch (error) {
              console.error("Error calling generateAIResponse:", error);
            }
          }
          
        
          // Handle normal messages
          if (
            !messageHandled &&
            selectedChatType !== undefined &&
            (selectedChatData._id === message.sender._id || selectedChatData._id === message.recipient._id)
          ) {
            // Ensure the message is not duplicated
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
        
          // Always add the message to DM contacts
          addContactsInDMContacts(message);
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
