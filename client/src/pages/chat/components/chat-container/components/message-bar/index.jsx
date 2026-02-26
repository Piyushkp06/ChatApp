import React, { useState, useRef, useEffect } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { useAppStore } from '@/store';
import { useSocket } from '@/context/SocketContext';
import apiClient from '@/lib/api-client';
import { UPLOAD_FILE_ROUTE } from '@/utils/constants';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Send, Paperclip, Smile, Mic, Image } from 'lucide-react';

function MessageBar() {
  const emojiRef = useRef();
  const fileInputRef = useRef();
  const inputRef = useRef();
  const socket = useSocket();
  
  const {
    selectedChatData,
    selectedChatType,
    userInfo,
    setIsUploading,
    setFileUploadProgress,
  } = useAppStore();
  
  const [message, setMessage] = useState("");
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    function handleClickOutside(event) {
      if (emojiRef.current && !emojiRef.current.contains(event.target)) {
        setEmojiPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleAddEmoji = (emoji) => {
    setMessage((message) => message + emoji.emoji);
    inputRef.current?.focus();
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    if (selectedChatType === "contact") {
      socket.emit("sendMessage", {
        sender: userInfo?.id,
        content: message,
        recipient: selectedChatData?._id,
        messageType: "text",
        fileUrl: undefined,
      });
    } else if (selectedChatType === "channel") {
      socket.emit("send-channel-message", {
        sender: userInfo?.id,
        content: message,
        messageType: "text",
        fileUrl: undefined,
        channelId: selectedChatData._id,
      });
    }
    setMessage("");
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAttachmentClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleAttachmentChange = async (event) => {
    try {
      const file = event.target.files[0];
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        setIsUploading(true);
        
        const response = await apiClient.post(UPLOAD_FILE_ROUTE, formData, {
          withCredentials: true,
          onUploadProgress: (data) => {
            setFileUploadProgress(Math.round((100 * data.loaded) / data.total));
          }
        });
        
        if (response.status === 200 && response.data) {
          setIsUploading(false);
          if (selectedChatType === "contact") {
            socket.emit("sendMessage", {
              sender: userInfo?.id,
              content: undefined,
              recipient: selectedChatData?._id,
              messageType: "file",
              fileUrl: response.data.filePath,
            });
          } else if (selectedChatType === "channel") {
            socket.emit("send-channel-message", {
              sender: userInfo.id,
              content: message,
              messageType: "file",
              fileUrl: response.data.filePath,
              channelId: selectedChatData._id,
            });
          }
        }
      }
    } catch (error) {
      setIsUploading(false);
      console.log(error);
    }
  };

  return (
    <div className="p-4 bg-[#0d0d12]/80 backdrop-blur-xl border-t border-white/5">
      <div className={`
        flex items-end gap-3 p-2 rounded-2xl bg-[#1a1a24] border transition-all duration-200
        ${isFocused ? 'border-violet-500/50 ring-2 ring-violet-500/10' : 'border-white/5'}
      `}>
        {/* Attachment Button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0 rounded-xl text-gray-400 hover:text-violet-400 hover:bg-violet-500/10"
                onClick={handleAttachmentClick}
              >
                <Paperclip className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-[#1a1a24] border-white/10">
              Attach File
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <input
          type="file"
          className="hidden"
          ref={fileInputRef}
          onChange={handleAttachmentChange}
        />

        {/* Image Button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0 rounded-xl text-gray-400 hover:text-violet-400 hover:bg-violet-500/10"
                onClick={handleAttachmentClick}
              >
                <Image className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-[#1a1a24] border-white/10">
              Send Image
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Input Field */}
        <div className="flex-1 min-w-0">
          <input
            ref={inputRef}
            type="text"
            className="w-full py-2.5 px-1 bg-transparent text-white placeholder:text-gray-500 focus:outline-none text-sm"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* Emoji Button */}
        <div className="relative" ref={emojiRef}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-10 w-10 shrink-0 rounded-xl transition-all ${
                    emojiPickerOpen 
                      ? 'text-violet-400 bg-violet-500/10' 
                      : 'text-gray-400 hover:text-violet-400 hover:bg-violet-500/10'
                  }`}
                  onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
                >
                  <Smile className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-[#1a1a24] border-white/10">
                Emoji
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {/* Emoji Picker */}
          <div className="absolute bottom-14 right-0 z-50">
            <EmojiPicker
              theme="dark"
              open={emojiPickerOpen}
              onEmojiClick={handleAddEmoji}
              autoFocusSearch={false}
              skinTonesDisabled
              searchDisabled={false}
              lazyLoadEmojis
              emojiStyle="native"
            />
          </div>
        </div>

        {/* Voice Message Button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0 rounded-xl text-gray-400 hover:text-violet-400 hover:bg-violet-500/10"
              >
                <Mic className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-[#1a1a24] border-white/10">
              Voice Message
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Send Button */}
        <Button
          size="icon"
          className={`h-10 w-10 shrink-0 rounded-xl transition-all duration-200 ${
            message.trim()
              ? 'gradient-primary glow-sm hover:opacity-90'
              : 'bg-white/5 text-gray-500 cursor-not-allowed'
          }`}
          onClick={handleSendMessage}
          disabled={!message.trim()}
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

export default MessageBar;
