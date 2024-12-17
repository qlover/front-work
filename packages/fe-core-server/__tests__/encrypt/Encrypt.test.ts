import { StringEntrypt, StringZlibEncrypt } from '../../src/encrypt';

describe('StringEntrypt', () => {
  // AES-256-CBC needs 32 bytes key
  const encryptionKey = 'test-encryption-key-32-bytes-long!!!'; // 32 bytes

  it('should encrypt and decrypt string correctly', () => {
    const encryptor = new StringEntrypt(encryptionKey);
    const originalText = 'Hello, World!';

    const encrypted = encryptor.encrypt(originalText);
    expect(encrypted).toContain(':'); // ensure contains IV separator

    const decrypted = encryptor.decrypt(encrypted);
    expect(decrypted).toBe(originalText);
  });

  it('should handle empty string', () => {
    const encryptor = new StringEntrypt(encryptionKey);
    const originalText = '';

    const encrypted = encryptor.encrypt(originalText);
    const decrypted = encryptor.decrypt(encrypted);
    expect(decrypted).toBe(originalText);
  });

  it('should handle special characters', () => {
    const encryptor = new StringEntrypt(encryptionKey);
    const originalText = '!@#$%^&*()_+-=[]{}|;:,.<>?`~';

    const encrypted = encryptor.encrypt(originalText);
    const decrypted = encryptor.decrypt(encrypted);
    expect(decrypted).toBe(originalText);
  });

  it('should handle different encoding', () => {
    const encryptor = new StringEntrypt(encryptionKey, 'hex');
    const originalText = 'Test with hex encoding';

    const encrypted = encryptor.encrypt(originalText);
    expect(encrypted).toMatch(/^[0-9a-f]+:[0-9a-f]+$/i); // hex format validation

    const decrypted = encryptor.decrypt(encrypted);
    expect(decrypted).toBe(originalText);
  });
});

describe('StringZlibEncrypt', () => {
  // AES-128-CBC needs 16 bytes key
  const encryptionKey = 'test-key-16-bytes!'; // 16 bytes

  it('should encrypt and decrypt string with compression', () => {
    const encryptor = new StringZlibEncrypt(encryptionKey);
    const originalText = 'Hello, World!'.repeat(100);

    const encrypted = encryptor.encrypt(originalText);
    expect(encrypted).toContain(':');

    const decrypted = encryptor.decrypt(encrypted);
    expect(decrypted).toBe(originalText);
  });

  it('should handle empty string with compression', () => {
    const encryptor = new StringZlibEncrypt(encryptionKey);
    const originalText = '';

    const encrypted = encryptor.encrypt(originalText);
    const decrypted = encryptor.decrypt(encrypted);
    expect(decrypted).toBe(originalText);
  });

  it('should handle unicode characters with compression', () => {
    const encryptor = new StringZlibEncrypt(encryptionKey);
    const originalText = '你好，世界！🌍';

    const encrypted = encryptor.encrypt(originalText);
    const decrypted = encryptor.decrypt(encrypted);
    expect(decrypted).toBe(originalText);
  });

  it('should compress long repetitive content', () => {
    const encryptor = new StringZlibEncrypt(encryptionKey);
    const originalText = 'a'.repeat(1000);

    const encrypted = encryptor.encrypt(originalText);
    // compressed length should be less than original length
    expect(encrypted.length).toBeLessThan(originalText.length);

    const decrypted = encryptor.decrypt(encrypted);
    expect(decrypted).toBe(originalText);
  });

  it('should handle different encoding', () => {
    const encryptor = new StringZlibEncrypt(encryptionKey, 'hex');
    const originalText = 'Test with hex encoding and compression';

    const encrypted = encryptor.encrypt(originalText);
    expect(encrypted).toMatch(/^[0-9a-f]+:[0-9a-f]+$/i); // hex format validation

    const decrypted = encryptor.decrypt(encrypted);
    expect(decrypted).toBe(originalText);
  });
});

describe('Encryption Error Handling', () => {
  it('should throw error when decrypting invalid data - StringEntrypt', () => {
    expect(() => new StringEntrypt('invalid-key')).toThrow();
  });

  it('should throw error when decrypting invalid data - StringZlibEncrypt', () => {
    const encryptionKey = 'test-key-16-bytes!'; // 16 bytes
    const encryptor = new StringZlibEncrypt(encryptionKey);
    expect(() => encryptor.decrypt('invalid:data')).toThrow();
  });
});
