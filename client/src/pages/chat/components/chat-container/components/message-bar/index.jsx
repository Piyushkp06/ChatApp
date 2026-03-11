import React, { useState, useRef, useEffect } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { useAppStore } from '@/store';
import { useSocket } from '@/context/SocketContext';
import { useEncryption } from '@/hooks/useEncryption';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import apiClient from '@/lib/api-client';
import { UPLOAD_FILE_ROUTE } from '@/utils/constants';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Send, Paperclip, Smile, Mic, Image, Lock, LockOpen, X, Reply, Eye, Square, Trash2, Play, Pause } from 'lucide-react';

function MessageBar() {
  const emojiRef = useRef();
  const fileInputRef = useRef();
  const viewOnceInputRef = useRef();
  const inputRef = useRef();
  const socket = useSocket();
  
  const {
    selectedChatData,
    selectedChatType,
    userInfo,
    setIsUploading,
    setFileUploadProgress,
    encryptionEnabled,
    setEncryptionEnabled,
    identityPublicKey,
    replyingTo,
    clearReplyingTo,
  } = useAppStore();
  
  const { encrypt, encryptionReady, establishSession } = useEncryption();
  
  const {
    isRecording,
    isPaused,
    formattedTime,
    audioBlob,
    audioUrl,
    audioLevel,
    error: recordingError,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    resetRecording,
  } = useVoiceRecorder();

  const [message, setMessage] = useState("");
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [isSendingVoice, setIsSendingVoice] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const previewAudioRef = useRef(null);

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

  // Focus input when replying
  useEffect(() => {
    if (replyingTo) {
      inputRef.current?.focus();
    }
  }, [replyingTo]);

  const handleAddEmoji = (emoji) => {
    setMessage((message) => message + emoji.emoji);
    inputRef.current?.focus();
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    if (selectedChatType === "contact") {
      setIsEncrypting(true);
      try {
        // AI System ID - don't encrypt messages to AI
        const AI_SYSTEM_ID = "649e8c5a3c2d3a1b9a5f4e2a";
        const isAIChat = selectedChatData?._id === AI_SYSTEM_ID;
        
        // Try to encrypt the message if encryption is enabled and not AI chat
        let encryptedContent = null;
        if (encryptionEnabled && encryptionReady && !isAIChat) {
          try {
            encryptedContent = await encrypt(selectedChatData?._id, message);
          } catch (err) {
            console.warn('Encryption failed, sending unencrypted:', err);
          }
        }
        
        if (encryptedContent) {
          // Send encrypted message
          socket.emit("sendMessage", {
            sender: userInfo?.id,
            content: "[Encrypted Message]", // Placeholder for unencrypted view
            recipient: selectedChatData?._id,
            messageType: "encrypted",
            encrypted: true,
            encryptedContent: encryptedContent,
            senderPublicKey: identityPublicKey,
            fileUrl: undefined,
            replyTo: replyingTo?._id || null,
          });
        } else {
          // Send unencrypted message (fallback or AI chat)
          socket.emit("sendMessage", {
            sender: userInfo?.id,
            content: message,
            recipient: selectedChatData?._id,
            messageType: "text",
            fileUrl: undefined,
            replyTo: replyingTo?._id || null,
          });
        }
      } finally {
        setIsEncrypting(false);
      }
    } else if (selectedChatType === "channel") {
      // Channel messages are not encrypted (group encryption is more complex)
      socket.emit("send-channel-message", {
        sender: userInfo?.id,
        content: message,
        messageType: "text",
        fileUrl: undefined,
        channelId: selectedChatData._id,
        replyTo: replyingTo?._id || null,
      });
    }
    setMessage("");
    clearReplyingTo();
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

  const handleViewOnceClick = () => {
    if (viewOnceInputRef.current) {
      viewOnceInputRef.current.click();
    }
  };

  const handleAttachmentChange = async (event, isViewOnce = false) => {
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
              replyTo: replyingTo?._id || null,
              viewOnce: isViewOnce,
            });
          } else if (selectedChatType === "channel") {
            socket.emit("send-channel-message", {
              sender: userInfo.id,
              content: message,
              messageType: "file",
              fileUrl: response.data.filePath,
              channelId: selectedChatData._id,
              replyTo: replyingTo?._id || null,
            });
          }
          clearReplyingTo();
        }
      }
    } catch (error) {
      setIsUploading(false);
      console.log(error);
    }
  };

  // Handle sending voice message
  const handleSendVoiceMessage = async () => {
    if (!audioBlob) return;

    try {
      setIsSendingVoice(true);
      
      // Create form data with voice file
      const formData = new FormData();
      const fileName = `voice-message-${Date.now()}.webm`;
      formData.append("file", audioBlob, fileName);
      
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
            messageType: "voice",
            fileUrl: response.data.filePath,
            replyTo: replyingTo?._id || null,
          });
        } else if (selectedChatType === "channel") {
          socket.emit("send-channel-message", {
            sender: userInfo.id,
            content: undefined,
            messageType: "voice",
            fileUrl: response.data.filePath,
            channelId: selectedChatData._id,
            replyTo: replyingTo?._id || null,
          });
        }
        
        resetRecording();
        clearReplyingTo();
        console.log('🎤 Voice message sent');
      }
    } catch (error) {
      console.error('Error sending voice message:', error);
      setIsUploading(false);
    } finally {
      setIsSendingVoice(false);
    }
  };

  // Toggle preview playback
  const togglePreviewPlayback = () => {
    if (!previewAudioRef.current) return;
    
    if (isPlayingPreview) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      previewAudioRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  // Handle preview audio ended
  const handlePreviewEnded = () => {
    setIsPlayingPreview(false);
  };

  return (
    <div className="p-4 bg-[#0d0d12]/80 backdrop-blur-xl border-t border-white/5">
      {/* Reply indicator */}
      {replyingTo && (
        <div className="flex items-center gap-3 mb-2 px-3 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20">
          <Reply className="h-4 w-4 text-violet-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-violet-400">
              Replying to {replyingTo.sender?.firstName || replyingTo.sender?.email || "message"}
            </p>
            <p className="text-sm text-gray-300 truncate">
              {replyingTo.content || (replyingTo.messageType === "file" ? "Media" : "Message")}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10"
            onClick={clearReplyingTo}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Recording indicator - shown while recording */}
      {isRecording && (
        <div className="flex items-center gap-3 mb-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <div className="relative flex items-center justify-center">
            <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
            <div 
              className="absolute h-6 w-6 rounded-full bg-red-500/30 animate-ping"
              style={{ animationDuration: '1.5s' }}
            />
          </div>
          
          {/* Audio level visualizer */}
          <div className="flex items-center gap-0.5 h-8">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-red-400 rounded-full transition-all duration-75"
                style={{
                  height: `${Math.max(4, audioLevel * 32 * (0.5 + Math.random() * 0.5))}px`,
                  opacity: audioLevel > 0.1 ? 1 : 0.3,
                }}
              />
            ))}
          </div>

          <span className="text-red-400 font-mono text-lg font-medium ml-2">
            {formattedTime}
          </span>
          
          <div className="flex-1" />
          
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10"
            onClick={cancelRecording}
          >
            <Trash2 className="h-5 w-5" />
          </Button>
          
          <Button
            size="sm"
            className="h-9 px-4 rounded-lg bg-red-500 hover:bg-red-600 text-white"
            onClick={stopRecording}
          >
            <Square className="h-4 w-4 mr-2" />
            Stop
          </Button>
        </div>
      )}

      {/* Voice message preview - shown after recording */}
      {audioUrl && !isRecording && (
        <div className="flex items-center gap-3 mb-2 px-4 py-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
          <audio 
            ref={previewAudioRef} 
            src={audioUrl} 
            onEnded={handlePreviewEnded}
            className="hidden" 
          />
          
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full bg-violet-500/20 text-violet-400 hover:bg-violet-500/30"
            onClick={togglePreviewPlayback}
          >
            {isPlayingPreview ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </Button>
          
          <div className="flex-1 flex items-center gap-3">
            <Mic className="h-4 w-4 text-violet-400" />
            <span className="text-violet-300 text-sm">Voice message</span>
            <span className="text-gray-500 text-sm">({formattedTime || '0:00'})</span>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10"
            onClick={() => {
              resetRecording();
              setIsPlayingPreview(false);
            }}
          >
            <Trash2 className="h-5 w-5" />
          </Button>
          
          <Button
            size="sm"
            className="h-9 px-4 rounded-lg gradient-primary text-white"
            onClick={handleSendVoiceMessage}
            disabled={isSendingVoice}
          >
            {isSendingVoice ? (
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send
              </>
            )}
          </Button>
        </div>
      )}

      {/* Recording error message */}
      {recordingError && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <X className="h-4 w-4" />
          {recordingError}
        </div>
      )}

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
          onChange={(e) => handleAttachmentChange(e, false)}
        />

        {/* View Once Image Button */}
        {selectedChatType === "contact" && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-xl text-gray-400 hover:text-violet-400 hover:bg-violet-500/10"
                  onClick={handleViewOnceClick}
                >
                  <Eye className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-[#1a1a24] border-white/10">
                View Once Photo
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        <input
          type="file"
          accept="image/*,video/*"
          className="hidden"
          ref={viewOnceInputRef}
          onChange={(e) => handleAttachmentChange(e, true)}
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
                className={`h-10 w-10 shrink-0 rounded-xl transition-all ${
                  isRecording 
                    ? 'text-red-400 bg-red-500/20 animate-pulse' 
                    : 'text-gray-400 hover:text-violet-400 hover:bg-violet-500/10'
                }`}
                onClick={isRecording ? stopRecording : startRecording}
              >
                {isRecording ? (
                  <Square className="h-5 w-5" />
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-[#1a1a24] border-white/10">
              {isRecording ? 'Stop Recording' : 'Voice Message'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Encryption Toggle Button */}
        {selectedChatType === "contact" && selectedChatData?._id !== "649e8c5a3c2d3a1b9a5f4e2a" && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-10 w-10 shrink-0 rounded-xl transition-all ${
                    encryptionEnabled && encryptionReady
                      ? 'text-green-400 bg-green-500/10 hover:bg-green-500/20' 
                      : 'text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10'
                  }`}
                  onClick={() => setEncryptionEnabled(!encryptionEnabled)}
                >
                  {encryptionEnabled && encryptionReady ? (
                    <Lock className="h-5 w-5" />
                  ) : (
                    <LockOpen className="h-5 w-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-[#1a1a24] border-white/10">
                {encryptionEnabled && encryptionReady 
                  ? 'End-to-End Encrypted' 
                  : 'Encryption Disabled'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Send Button */}
        <Button
          size="icon"
          className={`h-10 w-10 shrink-0 rounded-xl transition-all duration-200 ${
            message.trim() && !isEncrypting
              ? 'gradient-primary glow-sm hover:opacity-90'
              : 'bg-white/5 text-gray-500 cursor-not-allowed'
          }`}
          onClick={handleSendMessage}
          disabled={!message.trim() || isEncrypting}
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

export default MessageBar;
