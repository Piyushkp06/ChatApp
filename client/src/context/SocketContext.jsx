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
    console.log("userInfo:", userInfo);

    if (userInfo && userInfo?.userInfo?.id) {
      // Prevent multiple socket connections
      if (!socket.current) {
        socket.current = io(HOST, {
          withCredentials: true,
          query: { userId: userInfo?.userInfo?.id },
        });

        socket.current.on("connect", () => {
          console.log("Connected to socket server");
        });

        socket.current.on("receiveMessage", (message) => {
          const { selectedChatData, selectedChatType, addMessage } = useAppStore.getState();

          if (
            selectedChatType !== undefined &&
            (selectedChatData._id === message.sender._id ||
              selectedChatData._id === message.recipient._id)
          ) {
            addMessage(message);
          }
        });

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
