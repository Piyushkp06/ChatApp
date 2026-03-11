import { useAppStore } from '@/store'
import { React, useEffect } from 'react'
import { useNavigate } from 'react-router-dom';
import ContactsContainer from './components/contacts-container';
import EmptyChatContainer from './components/empty-chat-container';
import ChatContainer from './components/chat-container';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { Upload, Download } from 'lucide-react';
import { useEncryption } from '@/hooks/useEncryption';
import VoiceCallModal from '@/components/VoiceCallModal';
import IncomingCallModal from '@/components/IncomingCallModal';

function Chat() {
  const {
    userInfo,
    selectedChatType,
    isUploading,
    isDownloading,
    fileUploadProgress,
    fileDownloadProgress,
  } = useAppStore();
  
  const navigate = useNavigate();
  const { initialize: initEncryption, encryptionReady } = useEncryption();

  // Initialize encryption when chat loads
  useEffect(() => {
    const setupEncryption = async () => {
      try {
        await initEncryption();
        console.log('✅ E2E Encryption initialized');
      } catch (error) {
        console.error('Failed to initialize encryption:', error);
        toast.error('Failed to initialize encryption');
      }
    };

    if (userInfo?.id && !encryptionReady) {
      setupEncryption();
    }
  }, [userInfo?.id, encryptionReady, initEncryption]);

  useEffect(() => {
    if (!userInfo.profileSetup) {
      toast("Please setup profile to continue.");
      navigate("/profile");
    }
  }, [userInfo, navigate]);

  return (
    <div className="flex h-screen w-full dark bg-[#0a0a0f] text-white overflow-hidden">
      {/* Animated Background - subtle */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 -left-40 w-96 h-96 bg-violet-600/10 rounded-full blur-[150px]" />
      </div>

      {/* Upload Progress Overlay */}
      {isUploading && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center">
          <div className="glass rounded-3xl p-8 max-w-md w-full mx-4 space-y-6 animate-fade-in">
            <div className="flex items-center justify-center">
              <div className="h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center animate-pulse">
                <Upload className="h-8 w-8 text-white" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold text-white">Uploading File</h3>
              <p className="text-gray-400 text-sm">Please wait while we upload your file...</p>
            </div>
            <div className="space-y-2">
              <Progress value={fileUploadProgress} className="h-2 bg-white/10" />
              <p className="text-center text-violet-400 font-medium">{fileUploadProgress}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Download Progress Overlay */}
      {isDownloading && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center">
          <div className="glass rounded-3xl p-8 max-w-md w-full mx-4 space-y-6 animate-fade-in">
            <div className="flex items-center justify-center">
              <div className="h-16 w-16 rounded-2xl gradient-secondary flex items-center justify-center animate-pulse">
                <Download className="h-8 w-8 text-white" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold text-white">Downloading File</h3>
              <p className="text-gray-400 text-sm">Your file will be ready shortly...</p>
            </div>
            <div className="space-y-2">
              <Progress value={fileDownloadProgress} className="h-2 bg-white/10" />
              <p className="text-center text-violet-400 font-medium">{fileDownloadProgress}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Layout */}
      <div className="flex w-full h-full relative z-10">
        <ContactsContainer />
        {selectedChatType === undefined ? (
          <EmptyChatContainer />
        ) : (
          <ChatContainer />
        )}
      </div>

      {/* Voice/Video Call Modals */}
      <VoiceCallModal />
      <IncomingCallModal />
    </div>
  );
}

export default Chat;
