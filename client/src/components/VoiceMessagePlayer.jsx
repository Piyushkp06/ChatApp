import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Mic } from 'lucide-react';
import { HOST } from '@/utils/constants';

const VoiceMessagePlayer = ({ fileUrl, isSent = false }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Format time in mm:ss
  const formatTime = (seconds) => {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    const handleError = () => {
      setIsLoading(false);
      console.error('Error loading audio');
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const bounds = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - bounds.left;
    const percentage = x / bounds.width;
    const newTime = percentage * duration;
    
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className={`
        flex items-center gap-3 px-3 py-2 rounded-2xl min-w-[200px] max-w-[280px]
        ${isSent
          ? 'bg-gradient-to-r from-violet-600 to-purple-600 rounded-br-md'
          : 'bg-[#1a1a24] border border-white/5 rounded-bl-md'
        }
      `}
    >
      <audio ref={audioRef} src={`${HOST}/${fileUrl}`} preload="metadata" />
      
      {/* Play/Pause Button */}
      <Button
        variant="ghost"
        size="icon"
        className={`h-10 w-10 rounded-full shrink-0 ${
          isSent 
            ? 'bg-white/20 hover:bg-white/30 text-white' 
            : 'bg-violet-500/20 hover:bg-violet-500/30 text-violet-400'
        }`}
        onClick={togglePlayPause}
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : isPlaying ? (
          <Pause className="h-5 w-5" />
        ) : (
          <Play className="h-5 w-5 ml-0.5" />
        )}
      </Button>

      <div className="flex-1 flex flex-col gap-1">
        {/* Progress Bar */}
        <div 
          className="h-1.5 bg-white/20 rounded-full cursor-pointer relative overflow-hidden"
          onClick={handleSeek}
        >
          <div 
            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-100 ${
              isSent ? 'bg-white' : 'bg-violet-500'
            }`}
            style={{ width: `${progress}%` }}
          />
          {/* Waveform visualization (static) */}
          <div className="absolute inset-0 flex items-center justify-around px-1 pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className={`w-0.5 rounded-full ${
                  (i / 20) * 100 <= progress 
                    ? (isSent ? 'bg-white/60' : 'bg-violet-400/60')
                    : 'bg-white/20'
                }`}
                style={{
                  height: `${Math.max(2, Math.sin(i * 0.8) * 6 + Math.random() * 4)}px`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Time Display */}
        <div className={`flex items-center justify-between text-[10px] ${
          isSent ? 'text-white/70' : 'text-gray-500'
        }`}>
          <span>{formatTime(currentTime)}</span>
          <div className="flex items-center gap-1">
            <Mic className="h-3 w-3" />
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceMessagePlayer;
