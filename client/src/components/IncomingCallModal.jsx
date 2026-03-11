import React, { useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { useVoiceChat } from '@/hooks/useVoiceChat';
import { useAppStore } from '@/store';
import { HOST } from '@/utils/constants';
import { getColor } from '@/lib/utils';

export const IncomingCallModal = () => {
  const { acceptCall, rejectCall, incomingCall } = useVoiceChat();
  const { callState } = useAppStore();
  const ringtoneRef = useRef(null);

  const isOpen = callState === 'ringing' && incomingCall;
  const callerInfo = incomingCall?.callerInfo;
  const callType = incomingCall?.callType;

  // Play ringtone
  useEffect(() => {
    if (isOpen) {
      // Create and play ringtone (optional - fails gracefully if not present)
      try {
        ringtoneRef.current = new Audio('/ringtone.mp3');
        ringtoneRef.current.loop = true;
        ringtoneRef.current.volume = 0.5;
        ringtoneRef.current.play().catch(() => {
          // Ringtone file not found or autoplay blocked - continue without sound
          console.log('Ringtone could not be played');
        });
      } catch (error) {
        console.log('Audio not available');
      }
    }

    return () => {
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current = null;
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-sm bg-gradient-to-br from-[#1a1a2e] to-[#0d0d12] border-white/10 p-0 overflow-hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="flex flex-col items-center py-10 px-6">
          {/* Call type indicator */}
          <div className="mb-6 flex items-center gap-2 text-violet-400">
            {callType === 'video' ? (
              <>
                <Video className="h-5 w-5" />
                <span className="text-sm font-medium uppercase tracking-wider">
                  Incoming Video Call
                </span>
              </>
            ) : (
              <>
                <Phone className="h-5 w-5" />
                <span className="text-sm font-medium uppercase tracking-wider">
                  Incoming Voice Call
                </span>
              </>
            )}
          </div>

          {/* Avatar with pulsing ring */}
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-30" />
            <div className="absolute inset-0 rounded-full bg-green-500/20 animate-pulse" 
                 style={{ animationDelay: '0.5s' }} />
            <Avatar className="h-28 w-28 ring-4 ring-green-500/30 relative z-10">
              {callerInfo?.image ? (
                <AvatarImage
                  src={`${HOST}/${callerInfo.image}`}
                  alt="caller"
                  className="object-cover"
                />
              ) : (
                <AvatarFallback className={`${getColor(callerInfo?.color)} text-3xl font-semibold`}>
                  {callerInfo?.firstName?.[0]?.toUpperCase() || 
                   callerInfo?.email?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              )}
            </Avatar>
          </div>

          {/* Caller name */}
          <h2 className="text-white text-xl font-semibold mb-2">
            {callerInfo?.firstName 
              ? `${callerInfo.firstName} ${callerInfo.lastName || ''}`.trim()
              : callerInfo?.email || 'Unknown Caller'}
          </h2>
          
          <p className="text-gray-400 text-sm mb-8">
            {callType === 'video' ? 'wants to video call you' : 'wants to call you'}
          </p>

          {/* Action buttons */}
          <div className="flex items-center gap-8">
            {/* Reject */}
            <div className="flex flex-col items-center gap-2">
              <Button
                variant="destructive"
                size="icon"
                onClick={rejectCall}
                className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30 transition-transform hover:scale-105"
              >
                <PhoneOff className="h-7 w-7" />
              </Button>
              <span className="text-gray-400 text-xs">Decline</span>
            </div>

            {/* Accept */}
            <div className="flex flex-col items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={acceptCall}
                className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/30 transition-transform hover:scale-105"
              >
                {callType === 'video' ? (
                  <Video className="h-7 w-7" />
                ) : (
                  <Phone className="h-7 w-7" />
                )}
              </Button>
              <span className="text-gray-400 text-xs">Accept</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IncomingCallModal;
