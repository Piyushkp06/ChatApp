export const createChatSlice=(set,get)=>({
    selectedChatType:undefined,
    selectedChatData:undefined,
    selectedChatMessages:[],
    directMessagesContacts:[], 
    isUploading: false,
    isDownloading: false,
    fileUploadProgress: 0,
    fileDownloadProgress: 0,
    channels:[],
    setChannels:(channels)=>set({channels}),
    setIsUploading: (isUploading) => set({ isUploading }),
    setIsDownloading: (isDownloading) => set({ isDownloading }),
    setFileUploadProgress: (fileUploadProgress) => set({ fileUploadProgress }),
    setFileDownloadProgress: (fileDownloadProgress) => set({ fileDownloadProgress }),

    setSelectedChatType:(selectedChatType)=> set({selectedChatType}),
    setSelectedChatData:(selectedChatData)=> set({selectedChatData}),
    setSelectedChatMessages:(selectedChatMessages)=>set({selectedChatMessages}),
    setDirectMessagesContacts:(directMessagesContacts)=>set({directMessagesContacts}),
    addChannel:(channel)=>{
      const channels=get().channels;
      set({channels:[channel,...channels]})
    },
    closeChat:()=>set({
        selectedChatData:undefined,
        selectedChatType:undefined,
        selectedChatMessages:[],
    }),
    addMessage:(message)=>{
        const selectedChatType = get().selectedChatType;
        const selectedChatMessages = get().selectedChatMessages;
       // console.log("Before adding:", selectedChatMessages);
      
        const updatedMessages = [
          ...selectedChatMessages,
          {
            ...message,
            recipient: selectedChatType === "channel" ? message.recipient : message.recipient?._id,
            sender: selectedChatType === "channel" ? message.sender : message.sender?._id,
          },
        ];
      
      //  console.log("After adding:", updatedMessages);
        set({ selectedChatMessages: updatedMessages });
    }
})