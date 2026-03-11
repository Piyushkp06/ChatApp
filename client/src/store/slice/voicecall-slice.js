export const createVoiceCallSlice = (set, get) => ({
  // Call state
  callState: 'idle', // idle, calling, ringing, connecting, connected
  callType: null, // 'voice' or 'video'
  
  // Participants
  caller: null,
  recipient: null,
  
  // Media state
  isAudioMuted: false,
  isVideoOff: true,
  remoteAudioMuted: false,
  remoteVideoOff: true,
  
  // Incoming call data
  incomingCall: null,
  
  // Call timing
  callStartTime: null,
  
  // Actions
  setCallState: (callState) => set({ callState }),
  setCallType: (callType) => set({ callType }),
  setCaller: (caller) => set({ caller }),
  setRecipient: (recipient) => set({ recipient }),
  
  setIncomingCall: (incomingCall) => set({ incomingCall }),
  clearIncomingCall: () => set({ incomingCall: null }),
  
  setAudioMuted: (isAudioMuted) => set({ isAudioMuted }),
  setVideoOff: (isVideoOff) => set({ isVideoOff }),
  setRemoteAudioMuted: (remoteAudioMuted) => set({ remoteAudioMuted }),
  setRemoteVideoOff: (remoteVideoOff) => set({ remoteVideoOff }),
  
  setCallStartTime: (callStartTime) => set({ callStartTime }),
  
  // Start outgoing call
  initiateCall: (recipient, callType) => set({
    callState: 'calling',
    callType,
    recipient,
    caller: get().userInfo,
    isAudioMuted: false,
    isVideoOff: callType === 'voice',
  }),
  
  // Set call as connecting (after offer sent)
  setConnecting: () => set({ callState: 'connecting' }),
  
  // Set call as connected
  setConnected: () => set({ 
    callState: 'connected',
    callStartTime: Date.now(),
  }),
  
  // Receive incoming call
  receiveIncomingCall: (data) => set({
    incomingCall: {
      from: data.from,
      offer: data.offer,
      callType: data.callType,
      callerInfo: data.callerInfo,
    },
    callState: 'ringing',
  }),
  
  // Accept incoming call
  acceptIncomingCall: () => {
    const { incomingCall, userInfo } = get();
    if (incomingCall) {
      set({
        callState: 'connecting',
        callType: incomingCall.callType,
        caller: incomingCall.callerInfo,
        recipient: userInfo,
        isAudioMuted: false,
        isVideoOff: incomingCall.callType === 'voice',
      });
    }
  },
  
  // Reset call state
  resetCallState: () => set({
    callState: 'idle',
    callType: null,
    caller: null,
    recipient: null,
    isAudioMuted: false,
    isVideoOff: true,
    remoteAudioMuted: false,
    remoteVideoOff: true,
    incomingCall: null,
    callStartTime: null,
  }),
});
