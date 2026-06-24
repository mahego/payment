import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export class CryptoHelper {
  private static readonly ALGORITHM = 'aes-256-gcm';

  private static getKey(): Buffer {
    const secret = process.env.JWT_ACCESS_SECRET || 'fallback-secret-key-32-chars-long!!';
    // Ensure key is exactly 32 bytes (256 bits) for AES-256
    const key = Buffer.alloc(32);
    const secretBuf = Buffer.from(secret, 'utf8');
    secretBuf.copy(key);
    return key;
  }

  /**
   * Encrypts plain text using AES-256-GCM.
   * Returns a serialized string in the format iv:authTag:encryptedText
   */
  static encrypt(text: string): string {
    if (!text) return '';
    
    // Check if already encrypted to prevent double-encryption
    const parts = text.split(':');
    if (parts.length === 3 && parts[0].length === 24 && parts[1].length === 32) {
      return text;
    }

    try {
      const key = this.getKey();
      const iv = randomBytes(12);
      const cipher = createCipheriv(this.ALGORITHM, key, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag().toString('hex');
      
      return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    } catch (err: any) {
      throw new Error(`Encryption failed: ${err.message}`);
    }
  }

  /**
   * Decrypts a serialized string (iv:authTag:encryptedText).
   * Returns the original plain text. If the input format is invalid, returns the input as-is.
   */
  static decrypt(cipherText: string): string {
    if (!cipherText) return '';
    
    const parts = cipherText.split(':');
    if (parts.length !== 3) {
      // Fallback for unencrypted plain text passwords
      return cipherText;
    }

    try {
      const key = this.getKey();
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encryptedText = Buffer.from(parts[2], 'hex');
      
      const decipher = createDecipheriv(this.ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encryptedText as any, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (err) {
      // Fallback in case of wrong key or tampering
      return cipherText;
    }
  }
}
