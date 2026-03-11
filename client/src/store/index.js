import {create} from 'zustand';
import { createAuthSlice } from './slice/auth-slice';
import { createChatSlice } from './slice/chat-slice';
import { createEncryptionSlice } from './slice/encryption-slice';
import { createVoiceCallSlice } from './slice/voicecall-slice';

export const useAppStore = create()((...a)=>({
  ...createAuthSlice(...a),
  ...createChatSlice(...a),
  ...createEncryptionSlice(...a),
  ...createVoiceCallSlice(...a),
}))

