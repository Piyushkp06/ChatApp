import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useAppStore } from "@/store";
import { useSocket } from "@/context/SocketContext";
import { Reply, Trash2, UserX, Copy, Forward } from "lucide-react";
import { toast } from "sonner";

function MessageContextMenu({ children, message, isSent }) {
  const socket = useSocket();
  const { userInfo, setReplyingTo, selectedChatData, selectedChatType } = useAppStore();

  const handleReply = () => {
    setReplyingTo(message);
  };

  const handleCopyText = () => {
    if (message.content && !message.deletedForEveryone) {
      navigator.clipboard.writeText(message.content);
      toast.success("Message copied to clipboard");
    }
  };

  const handleDeleteForMe = () => {
    socket.emit("deleteMessageForMe", {
      messageId: message._id,
      userId: userInfo?.id,
    });
    toast.success("Message deleted for you");
  };

  const handleDeleteForEveryone = () => {
    const recipientId = typeof message.recipient === 'object' 
      ? message.recipient._id 
      : message.recipient;
    
    socket.emit("deleteMessageForEveryone", {
      messageId: message._id,
      senderId: userInfo?.id,
      recipientId: recipientId,
      channelId: selectedChatType === "channel" ? selectedChatData._id : null,
    });
    toast.success("Message deleted for everyone");
  };

  // Don't show context menu for deleted messages
  if (message.deletedForEveryone) {
    return children;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56 bg-[#1a1a24] border border-white/10 rounded-xl shadow-xl">
        <ContextMenuItem 
          onClick={handleReply}
          className="flex items-center gap-3 px-3 py-2.5 text-gray-200 hover:bg-violet-500/10 hover:text-violet-400 cursor-pointer rounded-lg mx-1"
        >
          <Reply className="h-4 w-4" />
          Reply
        </ContextMenuItem>
        
        {(message.messageType === "text" || message.messageType === "encrypted") && message.content && (
          <ContextMenuItem 
            onClick={handleCopyText}
            className="flex items-center gap-3 px-3 py-2.5 text-gray-200 hover:bg-violet-500/10 hover:text-violet-400 cursor-pointer rounded-lg mx-1"
          >
            <Copy className="h-4 w-4" />
            Copy Text
          </ContextMenuItem>
        )}
        
        <ContextMenuSeparator className="bg-white/10 my-1" />
        
        <ContextMenuItem 
          onClick={handleDeleteForMe}
          className="flex items-center gap-3 px-3 py-2.5 text-gray-200 hover:bg-red-500/10 hover:text-red-400 cursor-pointer rounded-lg mx-1"
        >
          <UserX className="h-4 w-4" />
          Delete for me
        </ContextMenuItem>
        
        {isSent && (
          <ContextMenuItem 
            onClick={handleDeleteForEveryone}
            className="flex items-center gap-3 px-3 py-2.5 text-red-400 hover:bg-red-500/10 cursor-pointer rounded-lg mx-1"
          >
            <Trash2 className="h-4 w-4" />
            Delete for everyone
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

export default MessageContextMenu;
