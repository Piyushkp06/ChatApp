import React from 'react'
import ChatHeader from './components/chat-header'
import MessageBar from './components/message-bar'
import MessageContainer from './components/message-container'

function ChatContainer() {
  return (
    <div className="fixed inset-0 md:static md:flex-1 flex flex-col bg-[#0a0a0f]">
      <ChatHeader />
      <MessageContainer />
      <MessageBar />
    </div>
  )
}

export default ChatContainer