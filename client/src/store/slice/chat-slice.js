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
    addMessage: (message) => {
      const selectedChatType = get().selectedChatType;
      const selectedChatMessages = get().selectedChatMessages;
    
   //   console.log("Before adding:", selectedChatMessages);
    
      // Normalize `sender` and `recipient` fields
      const normalizedMessage = {
        ...message,
        recipient:
          selectedChatType === "channel"
            ? message.recipient
            : typeof message.recipient === "object" && message.recipient?._id
            ? message.recipient._id
            : message.recipient,
        sender:
          selectedChatType === "channel"
            ? message.sender
            : typeof message.sender === "object" && message.sender?._id
            ? message.sender._id
            : message.sender,
      };
    
      const updatedMessages = [...selectedChatMessages, normalizedMessage];
    
    //  console.log("After adding:", updatedMessages);
      set({ selectedChatMessages: updatedMessages });
    },
    

    addChannelInChannelList: (message) => {
      const channels = get().channels;
      const data = channels.find((channel) => channel._id === message.channelId);
      const index = channels.findIndex(
        (channel) => channel._id === message.channelId
      );
    
      if (index !== -1 && index !== undefined) {
        channels.splice(index, 1);
        channels.unshift(data);
      }
    },
    addContactsInDMContacts: (message) => {
      const userId = get().userInfo.id;
      const fromId =
        message.sender._id === userId
          ? message.recipient._id
          : message.sender._id;
      const fromData =
        message.sender._id === userId ? message.recipient : message.sender;
    
      const dmContacts = get().directMessagesContacts;
      const data = dmContacts.find((contact) => contact._id === fromId);
      const index = dmContacts.findIndex((contact) => contact._id === fromId);
      console.log({ data, index, dmContacts, userId, message, fromData });
    
      if (index !== -1 && index !== undefined) {
      ///  console.log("in if condition");
        dmContacts.splice(index, 1);
        dmContacts.unshift(data);
      } else {
      //  console.log("in else condition");
        dmContacts.unshift(fromData);
      }
    
      set({ directMessagesContacts: dmContacts });
    },
    
})