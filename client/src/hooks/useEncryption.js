/**
 * Hook for managing end-to-end encryption in chat
 */
import { useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '@/store';
import apiClient from '@/lib/api-client';
import { 
  UPDATE_PUBLIC_KEY_ROUTE, 
  GET_PUBLIC_KEY_ROUTE,
  GET_PUBLIC_KEYS_ROUTE 
} from '@/utils/constants';
import { sessionManager } from '@/utils/ratchetSession';
import { initSodium } from '@/utils/crypto';

export function useEncryption() {
  const initializingRef = useRef(false);
  
  const {
    encryptionReady,
    identityPublicKey,
    initEncryption,
    setContactPublicKey,
    getContactPublicKey,
    hasSession,
    initSession,
    acceptSession,
    completeSession,
    encryptMessage,
    decryptMessage,
    encryptionEnabled,
    saveEncryptionState,
  } = useAppStore();

  /**
   * Initialize encryption and upload public key to server
   */
  const initialize = useCallback(async () => {
    if (initializingRef.current || encryptionReady) return;
    initializingRef.current = true;
    
    try {
      await initSodium();
      const publicKey = await initEncryption();
      
      // Upload public key to server
      await apiClient.post(UPDATE_PUBLIC_KEY_ROUTE, { publicKey });
      console.log('✅ Public key uploaded to server');
      
      return publicKey;
    } catch (error) {
      console.error('Failed to initialize encryption:', error);
      throw error;
    } finally {
      initializingRef.current = false;
    }
  }, [encryptionReady, initEncryption]);

  /**
   * Fetch a contact's public key from server
   */
  const fetchContactPublicKey = useCallback(async (contactId) => {
    try {
      const cached = getContactPublicKey(contactId);
      if (cached) return cached;

      const response = await apiClient.get(`${GET_PUBLIC_KEY_ROUTE}/${contactId}`);
      const { publicKey } = response.data.data;
      
      if (publicKey) {
        setContactPublicKey(contactId, publicKey);
      }
      
      return publicKey;
    } catch (error) {
      console.error(`Failed to fetch public key for ${contactId}:`, error);
      return null;
    }
  }, [getContactPublicKey, setContactPublicKey]);

  /**
   * Fetch multiple contacts' public keys
   */
  const fetchContactsPublicKeys = useCallback(async (contactIds) => {
    try {
      const response = await apiClient.post(GET_PUBLIC_KEYS_ROUTE, { userIds: contactIds });
      const { publicKeys } = response.data.data;
      
      for (const [contactId, data] of Object.entries(publicKeys)) {
        if (data.publicKey) {
          setContactPublicKey(contactId, data.publicKey);
        }
      }
      
      return publicKeys;
    } catch (error) {
      console.error('Failed to fetch public keys:', error);
      return {};
    }
  }, [setContactPublicKey]);

  /**
   * Establish encrypted session with a contact
   */
  const establishSession = useCallback(async (contactId) => {
    if (!encryptionReady) {
      throw new Error('Encryption not initialized');
    }

    if (hasSession(contactId)) {
      console.log(`Session already exists with ${contactId}`);
      return true;
    }

    // Fetch their public key
    const theirPublicKey = await fetchContactPublicKey(contactId);
    if (!theirPublicKey) {
      console.warn(`Cannot establish session - contact ${contactId} has no public key`);
      return false;
    }

    // Initialize session
    const ephemeralKey = await initSession(contactId, theirPublicKey);
    console.log(`✅ Session initiated with ${contactId}`);
    
    return { ephemeralKey };
  }, [encryptionReady, hasSession, fetchContactPublicKey, initSession]);

  /**
   * Accept an incoming session from a contact
   */
  const handleIncomingSession = useCallback(async (contactId, theirPublicKey, theirEphemeralKey) => {
    if (!encryptionReady) {
      throw new Error('Encryption not initialized');
    }

    const ephemeralKey = await acceptSession(contactId, theirPublicKey, theirEphemeralKey);
    console.log(`✅ Session accepted from ${contactId}`);
    
    return { ephemeralKey };
  }, [encryptionReady, acceptSession]);

  /**
   * Encrypt a message for sending
   */
  const encrypt = useCallback(async (contactId, plaintext) => {
    if (!encryptionEnabled) {
      return null; // Don't encrypt if disabled
    }

    if (!encryptionReady) {
      console.warn('Encryption not ready, sending unencrypted');
      return null;
    }

    // Ensure we have a session
    if (!hasSession(contactId)) {
      const result = await establishSession(contactId);
      if (!result) {
        console.warn('Could not establish session, sending unencrypted');
        return null;
      }
    }

    try {
      const encrypted = await encryptMessage(contactId, plaintext);
      return encrypted;
    } catch (error) {
      console.error('Encryption failed:', error);
      return null;
    }
  }, [encryptionEnabled, encryptionReady, hasSession, establishSession, encryptMessage]);

  /**
   * Decrypt a received message
   */
  const decrypt = useCallback(async (contactId, encryptedData) => {
    if (!encryptionReady) {
      throw new Error('Encryption not initialized');
    }

    try {
      const decrypted = await decryptMessage(contactId, encryptedData);
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw error;
    }
  }, [encryptionReady, decryptMessage]);

  return {
    encryptionReady,
    encryptionEnabled,
    identityPublicKey,
    initialize,
    fetchContactPublicKey,
    fetchContactsPublicKeys,
    establishSession,
    handleIncomingSession,
    encrypt,
    decrypt,
    hasSession,
  };
}
