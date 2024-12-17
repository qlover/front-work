import crypto from 'crypto';
import { Buffer } from 'buffer';
import zlib from 'zlib';
import { Encryptor } from '@qlover/fe-core';

/**
 * String encryption implementation with Zlib compression
 * Combines AES encryption with data compression
 *
 * Features:
 * - AES-128-CBC encryption
 * - Zlib compression
 * - IV support
 * - Configurable encoding
 *
 * @implements {Encryptor<string, string>}
 *
 * @example
 * ```typescript
 * const encryptor = new StringZlibEncrypt('my-16-char-key!!');
 *
 * // Encrypt and compress
 * const encrypted = encryptor.encrypt('large text data');
 *
 * // Decrypt and decompress
 * const decrypted = encryptor.decrypt(encrypted);
 * ```
 */
export class StringZlibEncrypt implements Encryptor<string, string> {
  private ALGORITHM = 'aes-128-cbc';
  private KEY: Buffer;
  private IV_LENGTH = 16;
  private KEY_LENGTH = 16;

  /**
   * Creates a new StringZlibEncrypt instance
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
   * Encrypts and compresses a string value
   * Applies compression before encryption
   *
   * @param value - String to encrypt
   * @returns Encrypted and compressed string with IV
   */
  encrypt(value: string): string {
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.ALGORITHM, this.KEY, iv);

    const compressedValue = zlib.deflateSync(value);
    let encrypted = cipher.update(compressedValue, undefined, this.encoding);
    encrypted += cipher.final(this.encoding);

    return `${encrypted}:${iv.toString(this.encoding)}`;
  }

  /**
   * Decrypts and decompresses an encrypted string
   * Applies decryption before decompression
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

    let decrypted = Buffer.from(
      decipher.update(encrypted, this.encoding, 'binary'),
      'binary'
    );
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    const decompressedValue = zlib.inflateSync(decrypted);

    return decompressedValue.toString();
  }
}
