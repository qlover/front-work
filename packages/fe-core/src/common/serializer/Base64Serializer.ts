import { Serializer } from '../../interface';

/**
 * Base64 serialization implementation
 * Provides string-to-base64 encoding/decoding with optional compression
 *
 * Features:
 * - Base64 encoding/decoding
 * - UTF-8 support
 * - URL-safe encoding option
 *
 * @implements {Serializer<string, string>}
 *
 * @since 1.0.10
 *
 * @example
 * ```typescript
 * const serializer = new Base64Serializer({ urlSafe: true });
 *
 * // Encode string to base64
 * const encoded = serializer.stringify("Hello World!");
 *
 * // Decode base64 back to string
 * const decoded = serializer.parse(encoded);
 * ```
 */
export class Base64Serializer implements Serializer<string, string> {
  constructor(
    private options: {
      /**
       * Use URL-safe base64 encoding
       * @default false
       *
       * @since 1.0.10
       */
      urlSafe?: boolean;
    } = {}
  ) {}

  /**
   * Serializes string to base64
   * @override
   * @since 1.0.10
   * @param data - String to encode
   * @returns Base64 encoded string
   */
  serialize(data: string): string {
    const base64 = Buffer.from(data, 'utf8').toString('base64');
    if (this.options.urlSafe) {
      return this.makeUrlSafe(base64);
    }
    return base64;
  }

  /**
   * Deserializes base64 string back to original
   * @override
   * @since 1.0.10
   * @param data - Base64 string to decode
   * @param defaultValue - Optional default value if decoding fails
   * @returns Decoded string
   */
  deserialize(data: string, defaultValue?: string): string {
    try {
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(data)) {
        return defaultValue ?? '';
      }

      if (this.options.urlSafe) {
        data = this.makeUrlUnsafe(data);
      }
      return Buffer.from(data, 'base64').toString('utf8');
    } catch {
      return defaultValue ?? '';
    }
  }

  /**
   * Converts standard base64 to URL-safe base64
   * @since 1.0.10
   * @param base64 - Standard base64 string
   * @returns URL-safe base64 string
   */
  private makeUrlSafe(base64: string): string {
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  /**
   * Converts URL-safe base64 back to standard base64
   * @private
   * @since 1.0.10
   * @param safe - URL-safe base64 string
   * @returns Standard base64 string
   */
  private makeUrlUnsafe(safe: string): string {
    safe = safe.replace(/-/g, '+').replace(/_/g, '/');
    while (safe.length % 4) {
      safe += '=';
    }
    return safe;
  }
}
