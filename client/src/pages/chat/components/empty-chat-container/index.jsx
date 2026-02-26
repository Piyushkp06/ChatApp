import React from 'react';
import { Player } from '@lottiefiles/react-lottie-player';
import { animationJson } from '@/lib/utils.js';
import { MessageCircle, Users, Sparkles, ArrowLeft } from 'lucide-react';

function EmptyChatContainer() {
  return (
    <div className="flex-1 flex flex-col justify-center items-center bg-[#0a0a0f] relative overflow-hidden">
      {/* Subtle Background Gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-violet-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-6 text-center space-y-8 animate-fade-in">
        {/* Lottie Animation */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-b from-violet-500/10 to-transparent rounded-full blur-2xl" />
          <Player
            autoplay
            loop
            src={animationJson}
            style={{ height: 180, width: 180 }}
            className="relative z-10"
          />
        </div>

        {/* Welcome Text */}
        <div className="space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Welcome to{' '}
            <span className="text-gradient">Syncronus</span>
          </h2>
          <p className="text-gray-400 text-lg">
            Select a conversation to start chatting or create a new one
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-3 gap-4 pt-6">
          <FeatureCard 
            icon={MessageCircle}
            title="Direct Messages"
            description="Chat privately"
          />
          <FeatureCard 
            icon={Users}
            title="Channels"
            description="Group conversations"
          />
          <FeatureCard 
            icon={Sparkles}
            title="AI Assistant"
            description="Smart suggestions"
          />
        </div>

        {/* Hint */}
        <div className="flex items-center justify-center gap-2 pt-4 text-gray-500">
          <ArrowLeft className="h-4 w-4 animate-pulse" />
          <span className="text-sm">Select a chat from the sidebar</span>
        </div>
      </div>
    </div>
  );
}

const FeatureCard = ({ icon: Icon, title, description }) => (
  <div className="p-4 rounded-2xl glass hover:bg-white/10 transition-all duration-300 group cursor-default">
    <div className="h-10 w-10 mx-auto mb-3 rounded-xl bg-violet-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
      <Icon className="h-5 w-5 text-violet-400" />
    </div>
    <h3 className="text-sm font-medium text-white mb-1">{title}</h3>
    <p className="text-xs text-gray-500">{description}</p>
  </div>
);

export default EmptyChatContainer;
