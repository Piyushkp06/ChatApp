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
        const selectedChatMessages = get().selectedChatMessages;
        const selectedChatType = get().selectedChatType;

        set({ 
          selectedChatMessages:[
            ...selectedChatMessages,{
                ...message,
                recipent: 
                selectedChatType === "channel"
                ? message.recipent
                 :message.recipent._id,
                 sender:
                 selectedChatType === "channel"
                 ? message.recipent
                  :message.recipent._id,
            }
          ]

        })
    }
})