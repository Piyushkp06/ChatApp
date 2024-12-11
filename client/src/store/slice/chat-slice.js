export const createChatSlice=(set,get)=>({
    selectedChatType:undefined,
    selectedChatData:undefined,
    selectedChatMessages:[],
    setSelectedChatType:(selectedChatType)=> set({selectedChatType}),
    setSelectedChatData:(selectedChatData)=> set({selectedChatData}),
    setSelectedChatMessages:(selectedChatMessages)=>set({selectedChatMessages}),
    closeChat:()=>set({
        selectedChatData:undefined,
        selectedChatType:undefined,
        selectedChatMessages:[],
    }),
    addMessage:(message)=>{
        const selectedChatType = get().selectedChatType;
        const selectedChatMessages = get().selectedChatMessages;
        console.log("Before adding:", selectedChatMessages);
      
        const updatedMessages = [
          ...selectedChatMessages,
          {
            ...message,
            recipient: selectedChatType === "channel" ? message.recipient : message.recipient?._id,
            sender: selectedChatType === "channel" ? message.sender : message.sender?._id,
          },
        ];
      
        console.log("After adding:", updatedMessages);
        set({ selectedChatMessages: updatedMessages });
    }
})