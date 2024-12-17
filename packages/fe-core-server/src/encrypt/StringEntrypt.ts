import crypto from 'crypto';
import { Buffer } from 'buffer';
import { Encryptor } from '@qlover/fe-core';

/**
 * Represents a string encryption utility using AES-256-CBC algorithm.
 *
 * This class provides methods to encrypt and decrypt string values securely.
 * It ensures that the encryption key meets the required length for AES-256.
 *
 * @example
 * ```typescript
 * const encryptor = new StringEntrypt('your-encryption-key');
 * const encrypted = encryptor.encrypt('your-string');
 * const decrypted = encryptor.decrypt(encrypted);
 * ```
 */
export class StringEntrypt implements Encryptor<string, string> {
  private ALGORITHM = 'aes-256-cbc';
  private KEY: Buffer;
  private KEY_LENGTH = 32; // AES-256 needs 32 bytes key

  /**
   * Creates a new StringEntrypt instance
   * @param encryptionKey - Key used for encryption/decryption
   * @param encoding - Output encoding format
   * @throws {RangeError} If key length is invalid
   */
  constructor(
    encryptionKey: string,
    private readonly encoding: globalThis.BufferEncoding = 'base64'
  ) {
    this.KEY = this.validateKey(encryptionKey);
  }

  /**
   * Validates and processes encryption key
   * Ensures key meets length requirements
   *
   * @param key - Raw encryption key
   * @returns Validated key buffer
   * @throws {RangeError} If key length is invalid
   */
  private validateKey(key: string): Buffer {
    const keyBuffer = Buffer.from(key.slice(0, this.KEY_LENGTH));

    if (keyBuffer.length !== this.KEY_LENGTH) {
      throw new RangeError(
        `Invalid key length. Expected ${this.KEY_LENGTH} bytes, got ${keyBuffer.length} bytes`
      );
    }

    return keyBuffer;
  }

  /**
   * Encrypts a string value
   * Uses random IV for each encryption
   *
   * @param value - String to encrypt
   * @returns Encrypted string with IV
   */
  encrypt(value: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.ALGORITHM, this.KEY, iv);
    let encrypted = cipher.update(value, 'utf8', this.encoding);
    encrypted += cipher.final(this.encoding);
    return `${encrypted}:${iv.toString(this.encoding)}`;
  }

  /**
   * Decrypts an encrypted string
   * Extracts IV from encrypted data
   *
   * @param encryptedData - Encrypted string with IV
   * @returns Original string
   */
  decrypt(encryptedData: string): string {
    const [encrypted, iv] = encryptedData.split(':');
    const decipher = crypto.createDecipheriv(
      this.ALGORITHM,
      this.KEY,
      Buffer.from(iv, this.encoding)
    );
    let decrypted = decipher.update(encrypted, this.encoding, 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
