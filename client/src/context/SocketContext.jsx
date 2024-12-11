import { useAppStore } from "@/store";
import { HOST } from "@/utils/constants";
import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const userInfo = useAppStore();


console.log(userInfo); // Full object
console.log(`${userInfo?.id}`); // Correctly fetches the ID

  useEffect(() => {
    if (userInfo) {
      const newSocket = io(HOST, {
        withCredentials: true,
        query: { userId: userInfo?.id },
      });

      newSocket.on("connect", () => {
        console.log("Socket connected");
        setSocket(newSocket);
      });

      newSocket.on("disconnect", () => {
        console.log("Socket disconnected");
      });

      const handleRecieveMessage = (message) => {
        console.log("whaata",message);
        const { selectedChatData, selectedChatType, addMessage } = useAppStore.getState();
      
        if (
          selectedChatType !== undefined &&
          (selectedChatData._id === message.sender._id || selectedChatData._id === message.recipient._id)
        ) {
          console.log("message rcv", message);
          addMessage(message);
        }
      };
      
      newSocket.on("recieveMessage", handleRecieveMessage);
      

      return () => {
        newSocket.disconnect();
        setSocket(null);
      };
    }
  }, [userInfo]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
