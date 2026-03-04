import React, { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/store";
import { useSocket } from "@/context/SocketContext";
import moment from "moment";
import apiClient from "@/lib/api-client";
import { GET_ALL_MESSAGES_ROUTE, GET_CHANNEL_MESSAGES_ROUTE, HOST } from "@/utils/constants";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getColor } from "@/lib/utils";
import { FileArchive, Download, X, Image as ImageIcon, Lock, ShieldCheck, ShieldAlert, Eye, EyeOff, Reply } from "lucide-react";
import { sessionManager } from "@/utils/ratchetSession";
import { initSodium } from "@/utils/crypto";
import MessageContextMenu from "../message-context-menu";

function MessageContainer() {
  const scrollRef = useRef();
  const socket = useSocket();
  const {
    selectedChatData,
    selectedChatType,
    userInfo,
    selectedChatMessages,
    setSelectedChatMessages,
    setIsDownloading,
    setFileDownloadProgress,
    setReplyingTo,
  } = useAppStore();

  const [showImage, setShowImage] = useState(false);
  const [imageURL, setImageURL] = useState(null);
  const [viewOnceImages, setViewOnceImages] = useState({}); // Track which view-once images are being viewed

  // Helper function to decrypt a message
  const decryptMessage = async (message, contactId) => {
    if (!message.encrypted || !message.encryptedContent) {
      return message;
    }
    
    try {
      await initSodium();
      
      // Try to decrypt if we have a session
      if (sessionManager.hasInitializedSession(contactId)) {
        const decryptedContent = await sessionManager.decrypt(contactId, message.encryptedContent);
        return { ...message, content: decryptedContent, decrypted: true };
      }
      
      // No session - can't decrypt historical messages without establishing session first
      return { ...message, content: '[Encrypted message - session required]', decryptionError: true };
    } catch (error) {
      console.error('Failed to decrypt historical message:', error);
      return { ...message, content: '[Decryption failed]', decryptionError: true };
    }
  };

  useEffect(() => {
    const getMessages = async () => {
      try {
        const response = await apiClient.post(
          GET_ALL_MESSAGES_ROUTE,
          { id: selectedChatData._id },
          { withCredentials: true }
        );
        if (response.data.messages) {
          // Decrypt encrypted messages
          const messages = await Promise.all(
            response.data.messages.map(async (msg) => {
              if (msg.encrypted && msg.encryptedContent) {
                const senderId = msg.sender?._id || msg.sender;
                return await decryptMessage(msg, senderId);
              }
              return msg;
            })
          );
          setSelectedChatMessages(messages);
        }
      } catch (error) {
        console.log({ error });
      }
    };

    const getChannelMessages = async () => {
      try {
        const response = await apiClient.get(
          `${GET_CHANNEL_MESSAGES_ROUTE}/${selectedChatData._id}`,
          { withCredentials: true }
        );
        if (response.data.messages) {
          setSelectedChatMessages(response.data.messages);
        }
      } catch (error) {
        console.log({ error });
      }
    };

    if (selectedChatData._id) {
      if (selectedChatType === "contact") getMessages();
      else if (selectedChatType === "channel") getChannelMessages();
    }
  }, [selectedChatData, selectedChatType, setSelectedChatMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedChatMessages]);

  const checkIfImage = (filePath) => {
    const imageRegex = /\.(jpg|jpeg|png|gif|bmp|tiff|tif|webp|svg|ico|heic|heif)$/i;
    return imageRegex.test(filePath);
  };

  const downloadFile = async (url) => {
    setIsDownloading(true);
    setFileDownloadProgress(0);
    const response = await apiClient.get(`${HOST}/${url}`, {
      responseType: "blob",
      onDownloadProgress: (progressEvent) => {
        const { loaded, total } = progressEvent;
        const percentCompleted = Math.round((loaded * 100) / total);
        setFileDownloadProgress(percentCompleted);
      },
    });

    const urlBlob = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = urlBlob;
    link.setAttribute("download", url.split("/").pop());
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(urlBlob);
    setIsDownloading(false);
    setFileDownloadProgress(0);
  };

  const renderMessages = () => {
    let lastDate = null;

    const filteredMessages = selectedChatMessages.filter((message) => {
      if (selectedChatType === "contact") {
        return (
          (message.sender === selectedChatData._id && message.recipient === userInfo?.id) ||
          (message.sender === userInfo?.id && message.recipient === selectedChatData._id)
        );
      } else if (selectedChatType === "channel") {
        return message.channelId === selectedChatData._id;
      }
      return false;
    });

    return filteredMessages.map((message, index) => {
      const messageDate = moment(message.timestamp).format("YYYY-MM-DD");
      const showDate = messageDate !== lastDate;
      lastDate = messageDate;

      return (
        <div key={index} className="animate-fade-in">
          {showDate && (
            <div className="flex items-center justify-center my-6">
              <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-400">
                {moment(message.timestamp).format("MMMM D, YYYY")}
              </div>
            </div>
          )}
          {selectedChatType === "contact" && renderDMMessages(message)}
          {selectedChatType === "channel" && renderChannelMessages(message)}
        </div>
      );
    });
  };

  const renderDMMessages = (message) => {
    const isSent = message.sender === userInfo?.id;
    const isDeleted = message.deletedForEveryone;
    const isViewOnce = message.viewOnce;
    const hasViewed = message.viewedBy?.includes(userInfo?.id);
    const isViewingNow = viewOnceImages[message._id];

    // Handle view once media
    const handleViewOnceClick = () => {
      if (isViewOnce && !isSent && !hasViewed) {
        setViewOnceImages(prev => ({ ...prev, [message._id]: true }));
        // Mark as viewed after 5 seconds
        setTimeout(() => {
          socket?.emit("markViewOnceViewed", {
            messageId: message._id,
            viewerId: userInfo?.id
          });
          setViewOnceImages(prev => ({ ...prev, [message._id]: false }));
        }, 5000);
      } else if (!isViewOnce) {
        setShowImage(true);
        setImageURL(message.fileUrl);
      }
    };

    // Scroll to replied message
    const scrollToReply = (replyId) => {
      const element = document.getElementById(`message-${replyId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('bg-violet-500/20');
        setTimeout(() => element.classList.remove('bg-violet-500/20'), 2000);
      }
    };

    return (
      <MessageContextMenu message={message} isSent={isSent}>
        <div 
          id={`message-${message._id}`}
          className={`flex mb-3 ${isSent ? "justify-end" : "justify-start"} transition-colors duration-300`}
        >
          <div className={`max-w-[70%] ${isSent ? "items-end" : "items-start"} flex flex-col`}>
            {/* Reply indicator */}
            {message.replyTo && (
              <div 
                onClick={() => scrollToReply(message.replyTo._id)}
                className={`
                  flex items-center gap-2 px-3 py-1.5 mb-1 rounded-lg cursor-pointer
                  ${isSent ? "bg-white/10" : "bg-white/5"} 
                  hover:bg-white/20 transition-colors
                `}
              >
                <Reply className="h-3 w-3 text-violet-400" />
                <div className="text-xs text-gray-400 truncate max-w-[200px]">
                  <span className="text-violet-400">
                    {message.replyTo.sender?.firstName || "User"}:
                  </span>{" "}
                  {message.replyTo.content || "Media"}
                </div>
              </div>
            )}

            {/* Deleted message */}
            {isDeleted ? (
              <div className={`
                px-4 py-3 rounded-2xl text-sm leading-relaxed italic text-gray-500
                ${isSent ? "bg-white/5 rounded-br-md" : "bg-[#1a1a24] border border-white/5 rounded-bl-md"}
              `}>
                This message was deleted
              </div>
            ) : (
              <>
                {(message.messageType === "text" || message.messageType === "encrypted") && (
                  <div
                    className={`
                      px-4 py-3 rounded-2xl text-sm leading-relaxed
                      ${isSent
                        ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-br-md"
                        : "bg-[#1a1a24] text-gray-200 border border-white/5 rounded-bl-md"
                      }
                    `}
                  >
                    <div className="flex items-start gap-2">
                      <span className="flex-1">{message.content}</span>
                      {/* Encryption indicator */}
                      {message.encrypted && (
                        <span className="flex-shrink-0 mt-0.5" title={message.decrypted ? "Decrypted message" : message.decryptionError ? "Decryption failed" : "Encrypted"}>
                          {message.decrypted ? (
                            <ShieldCheck className="h-3.5 w-3.5 text-green-400" />
                          ) : message.decryptionError ? (
                            <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
                          ) : (
                            <Lock className="h-3.5 w-3.5 text-gray-400" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {message.messageType === "file" && (
                  <div
                    className={`
                      rounded-2xl overflow-hidden
                      ${isSent
                        ? "bg-violet-600/20 border border-violet-500/30 rounded-br-md"
                        : "bg-[#1a1a24] border border-white/5 rounded-bl-md"
                      }
                    `}
                  >
                    {checkIfImage(message.fileUrl) ? (
                      <>
                        {/* View Once Media */}
                        {isViewOnce && !isSent && !hasViewed && !isViewingNow ? (
                          <div 
                            className="w-[300px] h-[200px] flex flex-col items-center justify-center bg-gradient-to-br from-violet-500/10 to-purple-500/10 cursor-pointer hover:from-violet-500/20 hover:to-purple-500/20 transition-all"
                            onClick={handleViewOnceClick}
                          >
                            <EyeOff className="h-12 w-12 text-violet-400 mb-2" />
                            <p className="text-sm text-violet-400">View Once Photo</p>
                            <p className="text-xs text-gray-500">Tap to view</p>
                          </div>
                        ) : isViewOnce && hasViewed && !isSent ? (
                          <div className="w-[300px] h-[200px] flex flex-col items-center justify-center bg-gray-800/50">
                            <Eye className="h-12 w-12 text-gray-500 mb-2" />
                            <p className="text-sm text-gray-500">Photo viewed</p>
                          </div>
                        ) : (
                          <div
                            className="cursor-pointer relative group"
                            onClick={handleViewOnceClick}
                          >
                            <img
                              src={`${HOST}/${message.fileUrl}`}
                              className="max-w-[300px] max-h-[300px] object-cover"
                              alt="shared"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <ImageIcon className="h-8 w-8 text-white" />
                            </div>
                            {/* View Once indicator for sender */}
                            {isViewOnce && isSent && (
                              <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 text-xs text-white">
                                <Eye className="h-3 w-3" />
                                {message.viewedBy?.length || 0}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-3 p-4">
                        <div className="h-12 w-12 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
                          <FileArchive className="h-6 w-6 text-violet-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">
                            {message.fileUrl.split("/").pop()}
                          </p>
                          <p className="text-xs text-gray-500">File</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 rounded-xl text-violet-400 hover:bg-violet-500/20"
                          onClick={() => downloadFile(message.fileUrl)}
                        >
                          <Download className="h-5 w-5" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            <span className="text-[10px] text-gray-500 mt-1 px-1">
              {moment(message.timestamp).format("h:mm A")}
            </span>
          </div>
        </div>
      </MessageContextMenu>
    );
  };

  const renderChannelMessages = (message) => {
    if (!message) return null;
    const isSent = message.sender._id === userInfo?.id;
    const isDeleted = message.deletedForEveryone;

    // Scroll to replied message
    const scrollToReply = (replyId) => {
      const element = document.getElementById(`message-${replyId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('bg-violet-500/20');
        setTimeout(() => element.classList.remove('bg-violet-500/20'), 2000);
      }
    };

    return (
      <MessageContextMenu message={message} isSent={isSent}>
        <div 
          id={`message-${message._id}`}
          className={`flex mb-4 ${isSent ? "justify-end" : "justify-start"} transition-colors duration-300`}
        >
          <div className={`flex gap-3 max-w-[70%] ${isSent ? "flex-row-reverse" : "flex-row"}`}>
            {/* Avatar - only show for received messages */}
            {!isSent && (
              <Avatar className="h-8 w-8 rounded-lg shrink-0 mt-1">
                {message.sender.image ? (
                  <AvatarImage
                    src={`${HOST}/${message.sender.image}`}
                    alt={message.sender.firstName}
                    className="object-cover"
                  />
                ) : (
                  <AvatarFallback className={`${getColor(message.sender.color)} text-xs`}>
                    {message.sender.firstName
                      ? message.sender.firstName[0].toUpperCase()
                      : message.sender.email[0].toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
            )}

            <div className={`flex flex-col ${isSent ? "items-end" : "items-start"}`}>
              {/* Sender name for received messages */}
              {!isSent && (
                <span className="text-xs text-violet-400 mb-1 px-1">
                  {message.sender.firstName} {message.sender.lastName}
                </span>
              )}

              {/* Reply indicator */}
              {message.replyTo && (
                <div 
                  onClick={() => scrollToReply(message.replyTo._id)}
                  className={`
                    flex items-center gap-2 px-3 py-1.5 mb-1 rounded-lg cursor-pointer
                    ${isSent ? "bg-white/10" : "bg-white/5"} 
                    hover:bg-white/20 transition-colors
                  `}
                >
                  <Reply className="h-3 w-3 text-violet-400" />
                  <div className="text-xs text-gray-400 truncate max-w-[200px]">
                    <span className="text-violet-400">
                      {message.replyTo.sender?.firstName || "User"}:
                    </span>{" "}
                    {message.replyTo.content || "Media"}
                  </div>
                </div>
              )}

              {/* Deleted message */}
              {isDeleted ? (
                <div className={`
                  px-4 py-3 rounded-2xl text-sm leading-relaxed italic text-gray-500
                  ${isSent ? "bg-white/5 rounded-br-md" : "bg-[#1a1a24] border border-white/5 rounded-bl-md"}
                `}>
                  This message was deleted
                </div>
              ) : (
                <>
                  {message.messageType === "text" && (
                    <div
                      className={`
                        px-4 py-3 rounded-2xl text-sm leading-relaxed
                        ${isSent
                          ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-br-md"
                          : "bg-[#1a1a24] text-gray-200 border border-white/5 rounded-bl-md"
                        }
                      `}
                    >
                      {message.content}
                    </div>
                  )}

                  {message.messageType === "file" && (
                    <div
                      className={`
                        rounded-2xl overflow-hidden
                        ${isSent
                          ? "bg-violet-600/20 border border-violet-500/30 rounded-br-md"
                          : "bg-[#1a1a24] border border-white/5 rounded-bl-md"
                        }
                      `}
                    >
                      {checkIfImage(message.fileUrl) ? (
                        <div
                          className="cursor-pointer relative group"
                          onClick={() => {
                            setShowImage(true);
                            setImageURL(message.fileUrl);
                          }}
                        >
                          <img
                            src={`${HOST}/${message.fileUrl}`}
                            className="max-w-[300px] max-h-[300px] object-cover"
                            alt="shared"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 p-4">
                          <div className="h-12 w-12 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
                            <FileArchive className="h-6 w-6 text-violet-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">
                              {message.fileUrl.split("/").pop()}
                            </p>
                            <p className="text-xs text-gray-500">File</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-xl text-violet-400 hover:bg-violet-500/20"
                            onClick={() => downloadFile(message.fileUrl)}
                          >
                            <Download className="h-5 w-5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              <span className="text-[10px] text-gray-500 mt-1 px-1">
                {moment(message.timestamp).format("h:mm A")}
              </span>
            </div>
          </div>
        </div>
      </MessageContextMenu>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#0a0a0f]">
      <div className="max-w-4xl mx-auto">
        {renderMessages()}
        <div ref={scrollRef} />
      </div>

      {/* Image Lightbox */}
      {showImage && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center animate-fade-in">
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <img
              src={`${HOST}/${imageURL}`}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
              alt="Preview"
            />
          </div>

          {/* Controls */}
          <div className="fixed top-6 right-6 flex gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 rounded-xl bg-white/10 text-white hover:bg-white/20"
              onClick={() => downloadFile(imageURL)}
            >
              <Download className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 rounded-xl bg-white/10 text-white hover:bg-red-500/20 hover:text-red-400"
              onClick={() => {
                setShowImage(false);
                setImageURL(null);
              }}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MessageContainer;
