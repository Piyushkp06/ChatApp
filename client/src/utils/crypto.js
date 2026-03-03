/**
 * Libsodium crypto utilities for end-to-end encryption
 * Uses crypto_box (X25519 + XSalsa20-Poly1305) with ratcheting
 */
import _sodium from 'libsodium-wrappers';

let sodium = null;

/**
 * Initialize libsodium - must be called before using any other functions
 */
export async function initSodium() {
  if (sodium) return sodium;
  await _sodium.ready;
  sodium = _sodium;
  return sodium;
}

/**
 * Get sodium instance (assumes already initialized)
 */
export function getSodium() {
  if (!sodium) {
    throw new Error('Sodium not initialized. Call initSodium() first.');
  }
  return sodium;
}

/**
 * Generate an identity key pair (long-term keys for the user)
 */
export function generateIdentityKeyPair() {
  const s = getSodium();
  return s.crypto_box_keypair();
}

/**
 * Generate an ephemeral key pair (for DH ratchet)
 */
export function generateEphemeralKeyPair() {
  const s = getSodium();
  return s.crypto_box_keypair();
}

/**
 * Derive a shared secret using X25519 Diffie-Hellman
 */
export function deriveSharedSecret(theirPublicKey, myPrivateKey) {
  const s = getSodium();
  return s.crypto_scalarmult(myPrivateKey, theirPublicKey);
}

/**
 * KDF ratchet step - derive new root key and chain key from current root key and DH output
 */
export function kdfRatchet(rootKey, dhOutput) {
  const s = getSodium();
  const inputKeyMaterial = new Uint8Array([...rootKey, ...dhOutput]);
  
  // Derive new root key
  const newRootKey = s.crypto_generichash(32, inputKeyMaterial, s.from_string('ratchet-root-key'));
  
  // Derive chain key
  const chainKey = s.crypto_generichash(32, inputKeyMaterial, s.from_string('ratchet-chain-key'));
  
  return { newRootKey, chainKey };
}

/**
 * Derive message key from chain key (symmetric ratchet step)
 */
export function deriveMessageKey(chainKey) {
  const s = getSodium();
  
  // Derive message key for encryption
  const messageKey = s.crypto_generichash(32, chainKey, s.from_string('message-key'));
  
  // Derive next chain key
  const newChainKey = s.crypto_generichash(32, chainKey, s.from_string('next-chain-key'));
  
  return { messageKey, newChainKey };
}

/**
 * Generate a random nonce for encryption
 */
export function generateNonce() {
  const s = getSodium();
  return s.randombytes_buf(s.crypto_box_NONCEBYTES);
}

/**
 * Encrypt a message using crypto_box (authenticated encryption)
 */
export function encryptWithKeyPair(message, nonce, theirPublicKey, myPrivateKey) {
  const s = getSodium();
  const messageBytes = typeof message === 'string' ? s.from_string(message) : message;
  const ciphertext = s.crypto_box_easy(messageBytes, nonce, theirPublicKey, myPrivateKey);
  return ciphertext;
}

/**
 * Decrypt a message using crypto_box
 */
export function decryptWithKeyPair(ciphertext, nonce, theirPublicKey, myPrivateKey) {
  const s = getSodium();
  const decrypted = s.crypto_box_open_easy(ciphertext, nonce, theirPublicKey, myPrivateKey);
  return s.to_string(decrypted);
}

/**
 * Encrypt using symmetric key (crypto_secretbox)
 */
export function encryptSymmetric(message, key) {
  const s = getSodium();
  const nonce = s.randombytes_buf(s.crypto_secretbox_NONCEBYTES);
  const messageBytes = typeof message === 'string' ? s.from_string(message) : message;
  const ciphertext = s.crypto_secretbox_easy(messageBytes, nonce, key);
  return { ciphertext, nonce };
}

/**
 * Decrypt using symmetric key (crypto_secretbox)
 */
export function decryptSymmetric(ciphertext, nonce, key) {
  const s = getSodium();
  const decrypted = s.crypto_secretbox_open_easy(ciphertext, nonce, key);
  return s.to_string(decrypted);
}

/**
 * Convert Uint8Array to base64 string
 */
export function toBase64(bytes) {
  const s = getSodium();
  return s.to_base64(bytes, s.base64_variants.ORIGINAL);
}

/**
 * Convert base64 string to Uint8Array
 */
export function fromBase64(base64String) {
  const s = getSodium();
  return s.from_base64(base64String, s.base64_variants.ORIGINAL);
}

/**
 * Securely compare two byte arrays (constant-time)
 */
export function secureCompare(a, b) {
  const s = getSodium();
  return s.compare(a, b) === 0;
}

/**
 * Generate a random 256-bit symmetric key
 */
export function generateSymmetricKey() {
  const s = getSodium();
  return s.crypto_secretbox_keygen();
}

/**
 * Hash data using BLAKE2b
 */
export function hash(data, keyOptional = null) {
  const s = getSodium();
  const dataBytes = typeof data === 'string' ? s.from_string(data) : data;
  return s.crypto_generichash(32, dataBytes, keyOptional);
}

/**
 * Serialize key pair for storage
 */
export function serializeKeyPair(keyPair) {
  return {
    publicKey: toBase64(keyPair.publicKey),
    privateKey: toBase64(keyPair.privateKey),
  };
}

/**
 * Deserialize key pair from storage
 */
export function deserializeKeyPair(serialized) {
  return {
    publicKey: fromBase64(serialized.publicKey),
    privateKey: fromBase64(serialized.privateKey),
  };
}
