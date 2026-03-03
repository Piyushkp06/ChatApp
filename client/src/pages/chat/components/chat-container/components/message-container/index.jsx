import React, { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/store";
import moment from "moment";
import apiClient from "@/lib/api-client";
import { GET_ALL_MESSAGES_ROUTE, GET_CHANNEL_MESSAGES_ROUTE, HOST } from "@/utils/constants";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getColor } from "@/lib/utils";
import { FileArchive, Download, X, Image as ImageIcon, Lock, ShieldCheck, ShieldAlert } from "lucide-react";
import { sessionManager } from "@/utils/ratchetSession";
import { initSodium } from "@/utils/crypto";

function MessageContainer() {
  const scrollRef = useRef();
  const {
    selectedChatData,
    selectedChatType,
    userInfo,
    selectedChatMessages,
    setSelectedChatMessages,
    setIsDownloading,
    setFileDownloadProgress,
  } = useAppStore();

  const [showImage, setShowImage] = useState(false);
  const [imageURL, setImageURL] = useState(null);

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

    return (
      <div className={`flex mb-3 ${isSent ? "justify-end" : "justify-start"}`}>
        <div className={`max-w-[70%] ${isSent ? "items-end" : "items-start"} flex flex-col`}>
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

          <span className="text-[10px] text-gray-500 mt-1 px-1">
            {moment(message.timestamp).format("h:mm A")}
          </span>
        </div>
      </div>
    );
  };

  const renderChannelMessages = (message) => {
    if (!message) return null;
    const isSent = message.sender._id === userInfo?.id;

    return (
      <div className={`flex mb-4 ${isSent ? "justify-end" : "justify-start"}`}>
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

            <span className="text-[10px] text-gray-500 mt-1 px-1">
              {moment(message.timestamp).format("h:mm A")}
            </span>
          </div>
        </div>
      </div>
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
