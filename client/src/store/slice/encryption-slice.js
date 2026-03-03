/**
 * Zustand slice for encryption state management
 */
import { sessionManager } from '@/utils/ratchetSession';

const STORAGE_KEY = 'e2e_encryption_state';

export const createEncryptionSlice = (set, get) => ({
  // Encryption state
  encryptionReady: false,
  identityPublicKey: null,
  contactPublicKeys: {}, // { contactId: publicKey }
  pendingKeyExchanges: {}, // { contactId: { status, ephemeralKey } }
  encryptionEnabled: true, // Toggle for encryption

  // Initialize encryption
  initEncryption: async () => {
    try {
      // Try to restore from localStorage
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        const restored = sessionManager.constructor.deserialize(data);
        Object.assign(sessionManager, restored);
        
        const identityPublicKey = sessionManager.getIdentityPublicKey();
        set({ 
          encryptionReady: true, 
          identityPublicKey,
        });
        console.log('✅ Encryption restored from storage');
        return identityPublicKey;
      }

      // Initialize fresh
      const { publicKey } = await sessionManager.init();
      set({ 
        encryptionReady: true, 
        identityPublicKey: publicKey,
      });
      
      // Save to storage
      get().saveEncryptionState();
      
      console.log('✅ Encryption initialized');
      return publicKey;
    } catch (error) {
      console.error('❌ Failed to initialize encryption:', error);
      set({ encryptionReady: false });
      throw error;
    }
  },

  // Save encryption state to localStorage
  saveEncryptionState: () => {
    try {
      const data = sessionManager.serialize();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save encryption state:', error);
    }
  },

  // Store a contact's public key
  setContactPublicKey: (contactId, publicKey) => {
    set((state) => ({
      contactPublicKeys: {
        ...state.contactPublicKeys,
        [contactId]: publicKey,
      },
    }));
  },

  // Get a contact's public key
  getContactPublicKey: (contactId) => {
    return get().contactPublicKeys[contactId] || null;
  },

  // Check if we have an initialized session with a contact
  hasSession: (contactId) => {
    return sessionManager.hasInitializedSession(contactId);
  },

  // Initialize a session with a contact (as initiator)
  initSession: async (contactId, theirPublicKey) => {
    try {
      set((state) => ({
        pendingKeyExchanges: {
          ...state.pendingKeyExchanges,
          [contactId]: { status: 'initiating' },
        },
      }));

      const { ephemeralPublicKey } = await sessionManager.initSession(contactId, theirPublicKey);
      
      set((state) => ({
        pendingKeyExchanges: {
          ...state.pendingKeyExchanges,
          [contactId]: { status: 'initiated', ephemeralKey: ephemeralPublicKey },
        },
      }));

      // Save state
      get().saveEncryptionState();

      return ephemeralPublicKey;
    } catch (error) {
      set((state) => ({
        pendingKeyExchanges: {
          ...state.pendingKeyExchanges,
          [contactId]: { status: 'failed', error: error.message },
        },
      }));
      throw error;
    }
  },

  // Accept a session from a contact (as responder)
  acceptSession: async (contactId, theirPublicKey, theirEphemeralPublicKey) => {
    try {
      const { ephemeralPublicKey } = await sessionManager.acceptSession(
        contactId, 
        theirPublicKey, 
        theirEphemeralPublicKey
      );
      
      set((state) => ({
        pendingKeyExchanges: {
          ...state.pendingKeyExchanges,
          [contactId]: { status: 'established' },
        },
      }));

      // Save state
      get().saveEncryptionState();

      return ephemeralPublicKey;
    } catch (error) {
      console.error('Failed to accept session:', error);
      throw error;
    }
  },

  // Complete session establishment (after receiving ack)
  completeSession: (contactId) => {
    set((state) => ({
      pendingKeyExchanges: {
        ...state.pendingKeyExchanges,
        [contactId]: { status: 'established' },
      },
    }));
    get().saveEncryptionState();
  },

  // Encrypt a message for a contact
  encryptMessage: async (contactId, plaintext) => {
    if (!get().encryptionEnabled) {
      return null; // Return null to indicate no encryption
    }

    if (!get().encryptionReady) {
      throw new Error('Encryption not initialized');
    }

    if (!sessionManager.hasInitializedSession(contactId)) {
      throw new Error(`No session with contact ${contactId}`);
    }

    const encrypted = await sessionManager.encrypt(contactId, plaintext);
    get().saveEncryptionState();
    return encrypted;
  },

  // Decrypt a message from a contact
  decryptMessage: async (contactId, encryptedData) => {
    if (!get().encryptionReady) {
      throw new Error('Encryption not initialized');
    }

    if (!sessionManager.hasInitializedSession(contactId)) {
      // Try to auto-establish session if we have their key
      console.warn(`No session with ${contactId}, message may be unreadable`);
      throw new Error(`No session with contact ${contactId}`);
    }

    const decrypted = await sessionManager.decrypt(contactId, encryptedData);
    get().saveEncryptionState();
    return decrypted;
  },

  // Toggle encryption
  setEncryptionEnabled: (enabled) => {
    set({ encryptionEnabled: enabled });
  },

  // Clear all encryption state (logout)
  clearEncryptionState: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({
      encryptionReady: false,
      identityPublicKey: null,
      contactPublicKeys: {},
      pendingKeyExchanges: {},
    });
  },
});
