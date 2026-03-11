import { useRef, useCallback, useEffect } from 'react';
import { useSocket } from '@/context/SocketContext';
import { useAppStore } from '@/store';

// ICE servers configuration for WebRTC
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
};

export const useVoiceChat = () => {
  const socket = useSocket();
  const {
    userInfo,
    selectedChatData,
    callState,
    callType,
    incomingCall,
    isAudioMuted,
    isVideoOff,
    initiateCall,
    setConnecting,
    setConnected,
    acceptIncomingCall,
    resetCallState,
    setAudioMuted,
    setVideoOff,
    setRemoteAudioMuted,
    setRemoteVideoOff,
    clearIncomingCall,
  } = useAppStore();

  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const remoteStream = useRef(null);
  const pendingCandidates = useRef([]);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  // Initialize peer connection
  const initializePeerConnection = useCallback(async (isVideo = false) => {
    // Close existing connection if any
    if (peerConnection.current) {
      peerConnection.current.close();
    }

    peerConnection.current = new RTCPeerConnection(ICE_SERVERS);
    remoteStream.current = new MediaStream();

    // Get local media stream
    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: isVideo ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        } : false,
      };

      localStream.current = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Add tracks to peer connection
      localStream.current.getTracks().forEach(track => {
        peerConnection.current.addTrack(track, localStream.current);
      });

      // Set local video if video call
      if (isVideo && localVideoRef.current) {
        localVideoRef.current.srcObject = localStream.current;
      }
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw new Error('Failed to access camera/microphone. Please check permissions.');
    }

    // Handle incoming tracks
    peerConnection.current.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind);
      event.streams[0].getTracks().forEach(track => {
        remoteStream.current.addTrack(track);
      });

      // Set remote video/audio
      if (remoteVideoRef.current && isVideo) {
        remoteVideoRef.current.srcObject = remoteStream.current;
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream.current;
      }
    };

    // Handle ICE candidates
    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate && socket) {
        const recipientId = incomingCall?.from || selectedChatData?._id;
        socket.emit('ice-candidate', {
          to: recipientId,
          candidate: event.candidate,
        });
      }
    };

    // Handle connection state changes
    peerConnection.current.onconnectionstatechange = () => {
      const state = peerConnection.current?.connectionState;
      console.log('Connection state:', state);
      
      if (state === 'connected') {
        setConnected();
      } else if (state === 'disconnected' || state === 'failed') {
        endCall();
      }
    };

    // Handle ICE connection state
    peerConnection.current.oniceconnectionstatechange = () => {
      const state = peerConnection.current?.iceConnectionState;
      console.log('ICE connection state:', state);
    };

    return peerConnection.current;
  }, [socket, selectedChatData, incomingCall, setConnected]);

  // Start an outgoing call
  const startCall = useCallback(async (type = 'voice') => {
    if (!selectedChatData?._id || !socket) {
      console.error('Cannot start call: no recipient or socket');
      return;
    }

    try {
      const isVideo = type === 'video';
      initiateCall(selectedChatData, type);
      
      await initializePeerConnection(isVideo);
      
      // Create and send offer
      const offer = await peerConnection.current.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: isVideo,
      });
      await peerConnection.current.setLocalDescription(offer);

      socket.emit('call-user', {
        to: selectedChatData._id,
        offer,
        callType: type,
        callerInfo: {
          _id: userInfo.id,
          firstName: userInfo.firstName,
          lastName: userInfo.lastName,
          email: userInfo.email,
          image: userInfo.image,
          color: userInfo.color,
        },
      });

      setConnecting();
      console.log(`📞 Starting ${type} call to ${selectedChatData._id}`);
    } catch (error) {
      console.error('Error starting call:', error);
      resetCallState();
    }
  }, [socket, selectedChatData, userInfo, initiateCall, setConnecting, initializePeerConnection, resetCallState]);

  // Accept incoming call
  const acceptCall = useCallback(async () => {
    if (!incomingCall || !socket) {
      console.error('No incoming call to accept');
      return;
    }

    try {
      const isVideo = incomingCall.callType === 'video';
      acceptIncomingCall();
      
      await initializePeerConnection(isVideo);
      
      // Set remote description from offer
      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(incomingCall.offer)
      );

      // Add any pending ICE candidates
      for (const candidate of pendingCandidates.current) {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
      pendingCandidates.current = [];

      // Create and send answer
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);

      socket.emit('call-accepted', {
        to: incomingCall.from,
        answer,
      });

      clearIncomingCall();
      console.log('✅ Call accepted');
    } catch (error) {
      console.error('Error accepting call:', error);
      resetCallState();
    }
  }, [socket, incomingCall, acceptIncomingCall, initializePeerConnection, clearIncomingCall, resetCallState]);

  // Reject incoming call
  const rejectCall = useCallback(() => {
    if (!incomingCall || !socket) return;

    socket.emit('call-rejected', {
      to: incomingCall.from,
      reason: 'declined',
    });

    resetCallState();
    console.log('❌ Call rejected');
  }, [socket, incomingCall, resetCallState]);

  // End ongoing call
  const endCall = useCallback(() => {
    const recipientId = incomingCall?.from || selectedChatData?._id;

    // Stop all tracks
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
      localStream.current = null;
    }

    // Close peer connection
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    // Clear remote stream
    remoteStream.current = null;

    // Notify other party
    if (socket && recipientId) {
      socket.emit('end-call', { to: recipientId });
    }

    resetCallState();
    console.log('📴 Call ended');
  }, [socket, selectedChatData, incomingCall, resetCallState]);

  // Toggle audio mute
  const toggleMute = useCallback(() => {
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioMuted(!audioTrack.enabled);

        // Notify other party
        const recipientId = incomingCall?.from || selectedChatData?._id;
        if (socket && recipientId) {
          socket.emit('toggle-media', {
            to: recipientId,
            mediaType: 'audio',
            enabled: audioTrack.enabled,
          });
        }
      }
    }
  }, [socket, selectedChatData, incomingCall, setAudioMuted]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream.current) {
      const videoTrack = localStream.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoOff(!videoTrack.enabled);

        // Notify other party
        const recipientId = incomingCall?.from || selectedChatData?._id;
        if (socket && recipientId) {
          socket.emit('toggle-media', {
            to: recipientId,
            mediaType: 'video',
            enabled: videoTrack.enabled,
          });
        }
      }
    }
  }, [socket, selectedChatData, incomingCall, setVideoOff]);

  // Handle incoming call-accepted event
  const handleCallAccepted = useCallback(async ({ answer }) => {
    if (!peerConnection.current) return;

    try {
      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(answer)
      );

      // Add any pending ICE candidates
      for (const candidate of pendingCandidates.current) {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
      pendingCandidates.current = [];

      console.log('✅ Remote answer set');
    } catch (error) {
      console.error('Error handling call accepted:', error);
    }
  }, []);

  // Handle ICE candidate
  const handleIceCandidate = useCallback(async ({ candidate }) => {
    if (!candidate) return;

    if (peerConnection.current && peerConnection.current.remoteDescription) {
      try {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    } else {
      // Store candidate for later
      pendingCandidates.current.push(candidate);
    }
  }, []);

  // Handle remote media toggle
  const handleRemoteMediaToggle = useCallback(({ mediaType, enabled }) => {
    if (mediaType === 'audio') {
      setRemoteAudioMuted(!enabled);
    } else if (mediaType === 'video') {
      setRemoteVideoOff(!enabled);
    }
  }, [setRemoteAudioMuted, setRemoteVideoOff]);

  // Setup socket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('call-accepted', handleCallAccepted);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('remote-media-toggle', handleRemoteMediaToggle);
    socket.on('call-rejected', () => {
      console.log('Call was rejected');
      resetCallState();
    });
    socket.on('call-unavailable', ({ reason }) => {
      console.log('Call unavailable:', reason);
      resetCallState();
    });
    socket.on('call-ended', () => {
      console.log('Call ended by remote');
      endCall();
    });

    return () => {
      socket.off('call-accepted', handleCallAccepted);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('remote-media-toggle', handleRemoteMediaToggle);
      socket.off('call-rejected');
      socket.off('call-unavailable');
      socket.off('call-ended');
    };
  }, [socket, handleCallAccepted, handleIceCandidate, handleRemoteMediaToggle, resetCallState, endCall]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStream.current) {
        localStream.current.getTracks().forEach(track => track.stop());
      }
      if (peerConnection.current) {
        peerConnection.current.close();
      }
    };
  }, []);

  return {
    // State
    callState,
    callType,
    incomingCall,
    isAudioMuted,
    isVideoOff,
    
    // Actions
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    
    // Refs for UI
    localVideoRef,
    remoteVideoRef,
    remoteAudioRef,
    localStream,
    remoteStream,
  };
};

export default useVoiceChat;
