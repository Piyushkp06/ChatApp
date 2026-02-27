import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HOST, GET_USER_STATUS_ROUTE } from '@/utils/constants';
import { getColor } from '@/lib/utils';
import { X, Hash, Users, Phone, Video, MoreVertical } from 'lucide-react';
import SummarizeDialog from '../summarize-dialog';
import apiClient from  '@/lib/api-client';

// Format last seen time in a human-readable way
const formatLastSeen = (lastSeenDate) => {
  if (!lastSeenDate) return 'Unknown';
  
  const now = new Date();
  const lastSeen = new Date(lastSeenDate);
  const diffMs = now - lastSeen;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSeconds < 60) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} min${diffMinutes > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  // For older dates, show the actual date
  return lastSeen.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: lastSeen.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
};

function ChatHeader() {
  const { closeChat, selectedChatData, selectedChatType } = useAppStore();
  const [userStatus, setUserStatus] = useState({ online: false, lastSeen: null });
  const [statusLoading, setStatusLoading] = useState(false);

  // Fetch user status when selected contact changes
  useEffect(() => {
    const fetchUserStatus = async () => {
      if (selectedChatType !== 'contact' || !selectedChatData?._id) {
        return;
      }
      
      setStatusLoading(true);
      try {
        const response = await apiClient.get(
          `${GET_USER_STATUS_ROUTE}/${selectedChatData._id}`,
          { withCredentials: true }
        );
        
        if (response.data) {
          setUserStatus({
            online: response.data.online === 1 || response.data.online === true,
            lastSeen: response.data.lastSeen
          });
        }
      } catch (error) {
        console.error('Failed to fetch user status:', error);
        setUserStatus({ online: false, lastSeen: null });
      } finally {
        setStatusLoading(false);
      }
    };

    fetchUserStatus();
    
    // Poll for status updates every 30 seconds
    const interval = setInterval(fetchUserStatus, 30000);
    return () => clearInterval(interval);
  }, [selectedChatData?._id, selectedChatType]);

  return (
    <div className="h-[72px] px-4 md:px-6 flex items-center justify-between bg-[#0d0d12]/80 backdrop-blur-xl border-b border-white/5">
      {/* Left Section - Avatar & Info */}
      <div className="flex items-center gap-4">
        {/* Avatar */}
        {selectedChatType === 'contact' ? (
          <Avatar className="h-11 w-11 rounded-xl ring-2 ring-violet-500/20">
            {selectedChatData.image ? (
              <AvatarImage
                src={`${HOST}/${selectedChatData.image}`}
                alt="profile"
                className="object-cover"
              />
            ) : (
              <AvatarFallback className={`${getColor(selectedChatData.color)} text-base font-medium`}>
                {selectedChatData.firstName
                  ? selectedChatData.firstName[0].toUpperCase()
                  : selectedChatData.email[0].toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
        ) : (
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
            <Hash className="h-5 w-5 text-white" />
          </div>
        )}

        {/* Name & Status */}
        <div className="flex flex-col">
          <h2 className="text-base font-semibold text-white">
            {selectedChatType === 'channel'
              ? selectedChatData.name
              : selectedChatData.firstName
                ? `${selectedChatData.firstName} ${selectedChatData.lastName || ''}`
                : selectedChatData.email}
          </h2>
          
          {selectedChatType === 'channel' && selectedChatData.members?.length > 0 ? (
            <div className="flex items-center gap-2 mt-0.5">
              <Users className="h-3 w-3 text-gray-500" />
              <span className="text-xs text-gray-400">
                {selectedChatData.members.length} members
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs text-violet-400 cursor-pointer hover:text-violet-300">
                      View all
                    </span>
                  </TooltipTrigger>
                  <TooltipContent 
                    side="bottom" 
                    className="bg-[#1a1a24] border-white/10 p-3 max-w-xs"
                  >
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-400 mb-2">Channel Members</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedChatData.members.map((member, index) => (
                          <Badge 
                            key={index}
                            variant="secondary"
                            className="bg-violet-500/20 text-violet-300 border-0 text-xs"
                          >
                            {member.firstName 
                              ? `${member.firstName} ${member.lastName || ''}`.trim()
                              : member.email}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          ) : selectedChatType === 'contact' ? (
            <div className="flex items-center gap-1.5 mt-0.5">
              {statusLoading ? (
                <span className="text-xs text-gray-500">Loading...</span>
              ) : userStatus.online ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs text-emerald-400">Online</span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-gray-500" />
                  <span className="text-xs text-gray-400">
                    Last seen {formatLastSeen(userStatus.lastSeen)}
                  </span>
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Right Section - Actions */}
      <div className="flex items-center gap-2">
        {/* AI Summarize Button */}
        <SummarizeDialog />

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-9 w-9 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
              >
                <Phone className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-[#1a1a24] border-white/10">
              Voice Call
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-9 w-9 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
              >
                <Video className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-[#1a1a24] border-white/10">
              Video Call
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-9 w-9 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-[#1a1a24] border-white/10">
              More Options
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="w-px h-6 bg-white/10 mx-1" />

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-9 w-9 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                onClick={closeChat}
              >
                <X className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-[#1a1a24] border-white/10">
              Close Chat
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

export default ChatHeader;
