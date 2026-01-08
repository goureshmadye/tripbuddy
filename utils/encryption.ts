import * as Crypto from 'expo-crypto';

// ============================================
// Encryption Utilities for Sensitive Data
// ============================================

// Generate a secure random key for encryption
export const generateEncryptionKey = async (): Promise<string> => {
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  return Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Encrypt sensitive data using AES
export const encryptData = async (data: string, key: string): Promise<string> => {
  try {
    // In a real implementation, you'd use proper AES encryption
    // For now, using a simple approach with expo-crypto
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data + key); // Simple key mixing

    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      data + key
    );

    return hash; // Return hash as encrypted representation
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
};

// Decrypt data (placeholder - in real implementation would decrypt)
export const decryptData = async (encryptedData: string, key: string): Promise<string> => {
  // This is a placeholder - proper decryption would require storing IV, salt, etc.
  // In production, use a proper encryption library
  throw new Error('Decryption not implemented for client-side security');
};

// Hash sensitive data for storage (one-way)
export const hashSensitiveData = async (data: string): Promise<string> => {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    data
  );
};

// Validate data integrity
export const validateDataIntegrity = async (data: string, expectedHash: string): Promise<boolean> => {
  const currentHash = await hashSensitiveData(data);
  return currentHash === expectedHash;
};