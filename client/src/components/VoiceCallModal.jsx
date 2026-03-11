import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff,
  Volume2,
  VolumeX 
} from 'lucide-react';
import { useVoiceChat } from '@/hooks/useVoiceChat';
import { useAppStore } from '@/store';
import { HOST } from '@/utils/constants';
import { getColor } from '@/lib/utils';

// Format call duration
const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const VoiceCallModal = () => {
  const {
    callState,
    callType,
    isAudioMuted,
    isVideoOff,
    endCall,
    toggleMute,
    toggleVideo,
    localVideoRef,
    remoteVideoRef,
    remoteAudioRef,
  } = useVoiceChat();

  const { 
    caller, 
    recipient, 
    callStartTime,
    remoteAudioMuted,
    remoteVideoOff,
    userInfo,
  } = useAppStore();

  const [duration, setDuration] = useState(0);

  // Get the other party's info
  const otherParty = caller?._id === userInfo?.id ? recipient : caller;

  // Update call duration
  useEffect(() => {
    let interval;
    if (callState === 'connected' && callStartTime) {
      interval = setInterval(() => {
        setDuration(Math.floor((Date.now() - callStartTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callState, callStartTime]);

  // Reset duration when call ends
  useEffect(() => {
    if (callState === 'idle') {
      setDuration(0);
    }
  }, [callState]);

  const isOpen = callState !== 'idle' && callState !== 'ringing';
  const isVideo = callType === 'video';

  const getStatusText = () => {
    switch (callState) {
      case 'calling':
        return 'Calling...';
      case 'connecting':
        return 'Connecting...';
      case 'connected':
        return formatDuration(duration);
      default:
        return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className={`${isVideo ? 'max-w-4xl h-[80vh]' : 'max-w-md'} bg-gradient-to-br from-[#1a1a2e] to-[#0d0d12] border-white/10 p-0 overflow-hidden`}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Hidden audio element for remote audio */}
        <audio ref={remoteAudioRef} autoPlay playsInline />

        {isVideo ? (
          // Video Call Layout
          <div className="relative w-full h-full">
            {/* Remote Video (Full screen) */}
            <div className="absolute inset-0 bg-gray-900">
              {remoteVideoOff ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Avatar className="h-32 w-32 ring-4 ring-violet-500/30">
                    {otherParty?.image ? (
                      <AvatarImage
                        src={`${HOST}/${otherParty.image}`}
                        alt="profile"
                        className="object-cover"
                      />
                    ) : (
                      <AvatarFallback className={`${getColor(otherParty?.color)} text-4xl font-semibold`}>
                        {otherParty?.firstName?.[0]?.toUpperCase() || otherParty?.email?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                </div>
              ) : (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* Local Video (Picture-in-picture) */}
            <div className="absolute top-4 right-4 w-40 h-28 rounded-xl overflow-hidden bg-gray-800 shadow-xl ring-2 ring-white/10">
              {isVideoOff ? (
                <div className="w-full h-full flex items-center justify-center bg-gray-800">
                  <VideoOff className="h-8 w-8 text-gray-500" />
                </div>
              ) : (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover mirror"
                  style={{ transform: 'scaleX(-1)' }}
                />
              )}
            </div>

            {/* Status Overlay */}
            <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2">
              <p className="text-white font-medium">
                {otherParty?.firstName || otherParty?.email || 'Unknown'}
              </p>
              <p className="text-green-400 text-sm">{getStatusText()}</p>
            </div>

            {/* Remote muted indicator */}
            {remoteAudioMuted && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500/80 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-2">
                <VolumeX className="h-4 w-4 text-white" />
                <span className="text-white text-sm">Muted</span>
              </div>
            )}

            {/* Controls */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                className={`h-14 w-14 rounded-full ${
                  isAudioMuted 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                {isAudioMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleVideo}
                className={`h-14 w-14 rounded-full ${
                  isVideoOff 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
              </Button>

              <Button
                variant="destructive"
                size="icon"
                onClick={endCall}
                className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600"
              >
                <PhoneOff className="h-7 w-7" />
              </Button>
            </div>
          </div>
        ) : (
          // Voice Call Layout
          <div className="flex flex-col items-center py-12 px-6">
            {/* Call status */}
            <div className="mb-8 text-center">
              <p className="text-violet-400 text-sm font-medium uppercase tracking-wider mb-1">
                {callType === 'voice' ? 'Voice Call' : 'Video Call'}
              </p>
              <p className="text-white text-lg">{getStatusText()}</p>
            </div>

            {/* Avatar */}
            <div className="relative mb-8">
              <div className={`absolute inset-0 rounded-full ${callState === 'connected' ? 'bg-green-500' : 'bg-violet-500'} animate-ping opacity-20`} />
              <Avatar className="h-32 w-32 ring-4 ring-violet-500/30">
                {otherParty?.image ? (
                  <AvatarImage
                    src={`${HOST}/${otherParty.image}`}
                    alt="profile"
                    className="object-cover"
                  />
                ) : (
                  <AvatarFallback className={`${getColor(otherParty?.color)} text-4xl font-semibold`}>
                    {otherParty?.firstName?.[0]?.toUpperCase() || otherParty?.email?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                )}
              </Avatar>
            </div>

            {/* Name */}
            <h2 className="text-white text-2xl font-semibold mb-2">
              {otherParty?.firstName 
                ? `${otherParty.firstName} ${otherParty.lastName || ''}`.trim()
                : otherParty?.email || 'Unknown'}
            </h2>

            {/* Remote muted indicator */}
            {remoteAudioMuted && callState === 'connected' && (
              <div className="flex items-center gap-2 text-amber-400 mb-4">
                <VolumeX className="h-4 w-4" />
                <span className="text-sm">Remote user is muted</span>
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center gap-6 mt-8">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                className={`h-14 w-14 rounded-full ${
                  isAudioMuted 
                    ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400' 
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                {isAudioMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </Button>

              <Button
                variant="destructive"
                size="icon"
                onClick={endCall}
                className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30"
              >
                <PhoneOff className="h-7 w-7" />
              </Button>

              {/* Speaker toggle placeholder - could be implemented for audio routing */}
              <Button
                variant="ghost"
                size="icon"
                className="h-14 w-14 rounded-full bg-white/10 hover:bg-white/20 text-white"
              >
                <Volume2 className="h-6 w-6" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VoiceCallModal;
