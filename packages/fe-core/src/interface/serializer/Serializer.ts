/**
 * Generic interface for data serialization/deserialization operations
 * Provides a standard contract for implementing serialization strategies
 *
 * This is a generic interface, you can implement it with different serialization strategies
 *
 * @template T - Type of data to serialize/deserialize, defaults to any
 * @template R - Type of serialized result, defaults to string
 *
 * @since 1.0.10
 *
 * @example
 * ```typescript
 * // JSON serialization implementation
 * class JSONSerializer implements Serializer {
 *   serialize(data: any): string {
 *     return JSON.stringify(data);
 *   }
 *
 *   deserialize(data: string): any {
 *     return JSON.parse(data);
 *   }
 * }
 * ```
 */
export interface Serializer<T = unknown, R = string> {
  /**
   * Serializes data into a target format
   * @since 1.0.10
   * @param data - Data to serialize
   * @returns Serialized representation
   */
  serialize(data: T): R;

  /**
   * Deserializes data from target format back to original form
   * @since 1.0.10
   * @param data - Data to deserialize
   * @param defaultValue - Optional default value to return if deserialization fails
   * @returns Original data structure
   */
  deserialize(data: R, defaultValue?: T): T;
}
