/**
 * Generic interface for encryption/decryption operations
 * Provides a standard contract for implementing encryption strategies
 *
 * @template ValueType - Type of value to encrypt/decrypt
 * @template EncryptResult - Type of encrypted result
 *
 * @example
 * ```typescript
 * // String encryption implementation
 * class StringEncryptor implements Encryptor<string, string> {
 *   encrypt(value: string): string {
 *     // Encryption logic
 *   }
 *
 *   decrypt(encryptedData: string): string {
 *     // Decryption logic
 *   }
 * }
 * ```
 */
export interface Encryptor<ValueType, EncryptResult> {
  /**
   * Encrypts the provided value
   * @param value - Value to encrypt
   * @returns Encrypted result
   */
  encrypt(value: ValueType): EncryptResult;

  /**
   * Decrypts the encrypted data
   * @param encryptedData - Data to decrypt
   * @returns Original value
   */
  decrypt(encryptedData: EncryptResult): ValueType;
}
