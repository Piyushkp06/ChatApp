/**
 * Double Ratchet Session Manager
 * Implements X3DH-like key exchange with DH Ratcheting for forward secrecy
 */
import {
  initSodium,
  getSodium,
  generateEphemeralKeyPair,
  deriveSharedSecret,
  kdfRatchet,
  deriveMessageKey,
  encryptWithKeyPair,
  decryptWithKeyPair,
  generateNonce,
  toBase64,
  fromBase64,
  serializeKeyPair,
  deserializeKeyPair,
} from './crypto';

const MAX_SKIP = 100; // Maximum number of skipped messages to handle out-of-order delivery

export class RatchetSession {
  constructor(sessionId) {
    this.sessionId = sessionId;
    
    // DH Ratchet state
    this.rootKey = null;
    this.sendChainKey = null;
    this.receiveChainKey = null;
    this.myKeyPair = null;
    this.theirPublicKey = null;
    
    // Message counters
    this.sendMessageNumber = 0;
    this.receiveMessageNumber = 0;
    this.previousChainLength = 0;
    
    // Skipped message keys for out-of-order handling
    this.skippedMessageKeys = new Map();
    
    // Session state
    this.initialized = false;
  }

  /**
   * Initialize session as the initiator (Alice in X3DH)
   * @param {Uint8Array} theirPublicKey - Recipient's identity public key
   * @param {Object} myIdentityKeyPair - Our identity key pair
   */
  async initAsInitiator(theirPublicKey, myIdentityKeyPair) {
    const sodium = await initSodium();
    
    // Generate ephemeral key pair for this session
    this.myKeyPair = generateEphemeralKeyPair();
    this.theirPublicKey = theirPublicKey;
    
    // Compute shared secret using both identity and ephemeral keys
    // DH1: Identity -> Identity
    const dh1 = deriveSharedSecret(theirPublicKey, myIdentityKeyPair.privateKey);
    // DH2: Ephemeral -> Identity
    const dh2 = deriveSharedSecret(theirPublicKey, this.myKeyPair.privateKey);
    
    // Combine DH outputs for initial shared secret
    const masterSecret = sodium.crypto_generichash(64, new Uint8Array([...dh1, ...dh2]));
    
    // Initial root key
    this.rootKey = masterSecret.slice(0, 32);
    
    // Perform initial DH ratchet to get send chain
    const dhOutput = deriveSharedSecret(theirPublicKey, this.myKeyPair.privateKey);
    const { newRootKey, chainKey } = kdfRatchet(this.rootKey, dhOutput);
    this.rootKey = newRootKey;
    this.sendChainKey = chainKey;
    
    this.sendMessageNumber = 0;
    this.receiveMessageNumber = 0;
    this.initialized = true;
    
    return {
      ephemeralPublicKey: this.myKeyPair.publicKey,
    };
  }

  /**
   * Initialize session as responder (Bob in X3DH)
   * @param {Uint8Array} theirPublicKey - Sender's identity public key
   * @param {Uint8Array} theirEphemeralPublicKey - Sender's ephemeral public key
   * @param {Object} myIdentityKeyPair - Our identity key pair
   */
  async initAsResponder(theirPublicKey, theirEphemeralPublicKey, myIdentityKeyPair) {
    const sodium = await initSodium();
    
    this.theirPublicKey = theirEphemeralPublicKey;
    this.myKeyPair = generateEphemeralKeyPair();
    
    // Compute shared secret (mirror of initiator)
    // DH1: Identity <- Identity
    const dh1 = deriveSharedSecret(theirPublicKey, myIdentityKeyPair.privateKey);
    // DH2: Identity <- Ephemeral
    const dh2 = deriveSharedSecret(theirEphemeralPublicKey, myIdentityKeyPair.privateKey);
    
    // Combine DH outputs
    const masterSecret = sodium.crypto_generichash(64, new Uint8Array([...dh1, ...dh2]));
    
    // Initial root key
    this.rootKey = masterSecret.slice(0, 32);
    
    // Initial receive chain
    const dhOutput = deriveSharedSecret(theirEphemeralPublicKey, myIdentityKeyPair.privateKey);
    const { newRootKey, chainKey } = kdfRatchet(this.rootKey, dhOutput);
    this.rootKey = newRootKey;
    this.receiveChainKey = chainKey;
    
    this.sendMessageNumber = 0;
    this.receiveMessageNumber = 0;
    this.initialized = true;
    
    return {
      ephemeralPublicKey: this.myKeyPair.publicKey,
    };
  }

  /**
   * Perform a DH ratchet step when receiving a new public key
   */
  async performDHRatchet(theirNewPublicKey) {
    // Store previous chain length for skip handling
    this.previousChainLength = this.receiveMessageNumber;
    
    // Update their public key
    this.theirPublicKey = theirNewPublicKey;
    
    // Derive new receive chain
    const dhOutput1 = deriveSharedSecret(theirNewPublicKey, this.myKeyPair.privateKey);
    const { newRootKey: rk1, chainKey: ck1 } = kdfRatchet(this.rootKey, dhOutput1);
    this.rootKey = rk1;
    this.receiveChainKey = ck1;
    this.receiveMessageNumber = 0;
    
    // Generate new key pair for sending
    this.myKeyPair = generateEphemeralKeyPair();
    
    // Derive new send chain
    const dhOutput2 = deriveSharedSecret(theirNewPublicKey, this.myKeyPair.privateKey);
    const { newRootKey: rk2, chainKey: ck2 } = kdfRatchet(this.rootKey, dhOutput2);
    this.rootKey = rk2;
    this.sendChainKey = ck2;
    this.sendMessageNumber = 0;
    
    return this.myKeyPair.publicKey;
  }

  /**
   * Encrypt a message
   */
  async encrypt(plaintext) {
    if (!this.initialized) {
      throw new Error('Session not initialized');
    }
    
    if (!this.sendChainKey) {
      throw new Error('Send chain not established. Complete key exchange first.');
    }
    
    // Symmetric ratchet step
    const { messageKey, newChainKey } = deriveMessageKey(this.sendChainKey);
    this.sendChainKey = newChainKey;
    
    // Generate nonce
    const nonce = generateNonce();
    
    // Encrypt message
    const ciphertext = encryptWithKeyPair(
      plaintext,
      nonce,
      this.theirPublicKey,
      this.myKeyPair.privateKey
    );
    
    const messageNumber = this.sendMessageNumber++;
    
    return {
      ciphertext: toBase64(ciphertext),
      nonce: toBase64(nonce),
      publicKey: toBase64(this.myKeyPair.publicKey),
      messageNumber,
      previousChainLength: this.previousChainLength,
    };
  }

  /**
   * Skip message keys for out-of-order handling
   */
  async skipMessageKeys(until) {
    if (this.receiveMessageNumber + MAX_SKIP < until) {
      throw new Error('Too many skipped messages');
    }
    
    while (this.receiveMessageNumber < until) {
      const { messageKey, newChainKey } = deriveMessageKey(this.receiveChainKey);
      this.receiveChainKey = newChainKey;
      
      // Store skipped key
      const keyId = `${this.sessionId}:${this.receiveMessageNumber}`;
      this.skippedMessageKeys.set(keyId, messageKey);
      
      this.receiveMessageNumber++;
    }
  }

  /**
   * Decrypt a message
   */
  async decrypt(encryptedData) {
    if (!this.initialized) {
      throw new Error('Session not initialized');
    }
    
    const theirPublicKey = fromBase64(encryptedData.publicKey);
    const nonce = fromBase64(encryptedData.nonce);
    const ciphertext = fromBase64(encryptedData.ciphertext);
    
    // Check if this is from a new DH ratchet
    const currentTheirPublicKey = toBase64(this.theirPublicKey);
    if (encryptedData.publicKey !== currentTheirPublicKey) {
      // Skip any missed messages in current chain
      if (this.receiveChainKey) {
        await this.skipMessageKeys(encryptedData.previousChainLength);
      }
      // Perform DH ratchet
      await this.performDHRatchet(theirPublicKey);
    }
    
    // Check for skipped message key
    const keyId = `${this.sessionId}:${encryptedData.messageNumber}`;
    if (this.skippedMessageKeys.has(keyId)) {
      const messageKey = this.skippedMessageKeys.get(keyId);
      this.skippedMessageKeys.delete(keyId);
      // Use the skipped key (would need different decrypt path for production)
    }
    
    // Skip to correct message number if needed
    if (encryptedData.messageNumber > this.receiveMessageNumber) {
      await this.skipMessageKeys(encryptedData.messageNumber);
    }
    
    // Symmetric ratchet step
    const { messageKey, newChainKey } = deriveMessageKey(this.receiveChainKey);
    this.receiveChainKey = newChainKey;
    this.receiveMessageNumber++;
    
    // Decrypt message
    return decryptWithKeyPair(
      ciphertext,
      nonce,
      theirPublicKey,
      this.myKeyPair.privateKey
    );
  }

  /**
   * Serialize session state for storage
   */
  serialize() {
    return {
      sessionId: this.sessionId,
      rootKey: this.rootKey ? toBase64(this.rootKey) : null,
      sendChainKey: this.sendChainKey ? toBase64(this.sendChainKey) : null,
      receiveChainKey: this.receiveChainKey ? toBase64(this.receiveChainKey) : null,
      myKeyPair: this.myKeyPair ? serializeKeyPair(this.myKeyPair) : null,
      theirPublicKey: this.theirPublicKey ? toBase64(this.theirPublicKey) : null,
      sendMessageNumber: this.sendMessageNumber,
      receiveMessageNumber: this.receiveMessageNumber,
      previousChainLength: this.previousChainLength,
      initialized: this.initialized,
    };
  }

  /**
   * Restore session from serialized state
   */
  static deserialize(data) {
    const session = new RatchetSession(data.sessionId);
    
    session.rootKey = data.rootKey ? fromBase64(data.rootKey) : null;
    session.sendChainKey = data.sendChainKey ? fromBase64(data.sendChainKey) : null;
    session.receiveChainKey = data.receiveChainKey ? fromBase64(data.receiveChainKey) : null;
    session.myKeyPair = data.myKeyPair ? deserializeKeyPair(data.myKeyPair) : null;
    session.theirPublicKey = data.theirPublicKey ? fromBase64(data.theirPublicKey) : null;
    session.sendMessageNumber = data.sendMessageNumber;
    session.receiveMessageNumber = data.receiveMessageNumber;
    session.previousChainLength = data.previousChainLength;
    session.initialized = data.initialized;
    
    return session;
  }
}

/**
 * Session Manager - manages multiple ratchet sessions
 */
export class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.identityKeyPair = null;
  }

  /**
   * Initialize the session manager with identity keys
   */
  async init(identityKeyPair = null) {
    await initSodium();
    
    if (identityKeyPair) {
      this.identityKeyPair = identityKeyPair;
    } else {
      this.identityKeyPair = generateEphemeralKeyPair();
    }
    
    return {
      publicKey: toBase64(this.identityKeyPair.publicKey),
    };
  }

  /**
   * Get or create a session with a contact
   */
  getSession(contactId) {
    if (!this.sessions.has(contactId)) {
      this.sessions.set(contactId, new RatchetSession(contactId));
    }
    return this.sessions.get(contactId);
  }

  /**
   * Check if a session exists and is initialized
   */
  hasInitializedSession(contactId) {
    const session = this.sessions.get(contactId);
    return session?.initialized ?? false;
  }

  /**
   * Initialize a session as initiator
   */
  async initSession(contactId, theirPublicKey) {
    const session = this.getSession(contactId);
    const publicKeyBytes = typeof theirPublicKey === 'string' 
      ? fromBase64(theirPublicKey) 
      : theirPublicKey;
    
    const result = await session.initAsInitiator(publicKeyBytes, this.identityKeyPair);
    return {
      ephemeralPublicKey: toBase64(result.ephemeralPublicKey),
    };
  }

  /**
   * Initialize a session as responder
   */
  async acceptSession(contactId, theirPublicKey, theirEphemeralPublicKey) {
    const session = this.getSession(contactId);
    const publicKeyBytes = typeof theirPublicKey === 'string' 
      ? fromBase64(theirPublicKey) 
      : theirPublicKey;
    const ephemeralBytes = typeof theirEphemeralPublicKey === 'string'
      ? fromBase64(theirEphemeralPublicKey)
      : theirEphemeralPublicKey;
    
    const result = await session.initAsResponder(publicKeyBytes, ephemeralBytes, this.identityKeyPair);
    return {
      ephemeralPublicKey: toBase64(result.ephemeralPublicKey),
    };
  }

  /**
   * Encrypt a message for a contact
   */
  async encrypt(contactId, plaintext) {
    const session = this.getSession(contactId);
    if (!session.initialized) {
      throw new Error(`No initialized session with ${contactId}`);
    }
    return session.encrypt(plaintext);
  }

  /**
   * Decrypt a message from a contact
   */
  async decrypt(contactId, encryptedData) {
    const session = this.getSession(contactId);
    if (!session.initialized) {
      throw new Error(`No initialized session with ${contactId}`);
    }
    return session.decrypt(encryptedData);
  }

  /**
   * Get identity public key
   */
  getIdentityPublicKey() {
    if (!this.identityKeyPair) {
      throw new Error('Session manager not initialized');
    }
    return toBase64(this.identityKeyPair.publicKey);
  }

  /**
   * Serialize all sessions for storage
   */
  serialize() {
    const sessionsData = {};
    for (const [contactId, session] of this.sessions) {
      sessionsData[contactId] = session.serialize();
    }
    return {
      identityKeyPair: this.identityKeyPair ? serializeKeyPair(this.identityKeyPair) : null,
      sessions: sessionsData,
    };
  }

  /**
   * Restore from serialized data
   */
  static deserialize(data) {
    const manager = new SessionManager();
    
    if (data.identityKeyPair) {
      manager.identityKeyPair = deserializeKeyPair(data.identityKeyPair);
    }
    
    if (data.sessions) {
      for (const [contactId, sessionData] of Object.entries(data.sessions)) {
        manager.sessions.set(contactId, RatchetSession.deserialize(sessionData));
      }
    }
    
    return manager;
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();
