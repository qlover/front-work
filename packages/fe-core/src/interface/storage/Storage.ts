/**
 * Interface representing a synchronous storage mechanism.
 *
 * @template Key - The type of keys used to identify stored values.
 * @template ValueType - The type of values stored, defaults to unknown.
 *
 * @example
 * ```typescript
 * const storage: SyncStorage<string, number> = ...;
 * storage.setItem('key', 123);
 * const value = storage.getItem('key', 0);
 * ```
 */
export interface SyncStorage<Key, ValueType = unknown> {
  /**
   * The number of items stored.
   */
  readonly length: number;

  /**
   * Stores a value with the specified key.
   *
   * @param key - The key to identify the stored value.
   * @param value - The value to store.
   * @param options - Optional parameters for storage.
   */
  setItem<T>(key: Key, value: T, options?: unknown): void;

  /**
   * Retrieves a value by key.
   *
   * @param key - The key of the value to retrieve.
   * @param defaultValue - The default value to return if the key is not found.
   * @param options - Optional parameters for retrieval.
   * @returns The value associated with the key, or the default value if not found.
   */
  getItem<T extends ValueType>(
    key: Key,
    defaultValue?: T,
    options?: unknown
  ): T | null;

  /**
   * Removes a value by key.
   *
   * @param key - The key of the value to remove.
   * @param options - Optional parameters for removal.
   */
  removeItem(key: Key, options?: unknown): void;

  /**
   * Clears all stored values.
   */
  clear(): void;
}

/**
 * Interface representing an asynchronous storage mechanism.
 *
 * @template Key - The type of keys used to identify stored values.
 * @template ValueType - The type of values stored, defaults to unknown.
 *
 * @example
 *
 * ```typescript
 * const storage: AsyncStorage<string, number> = ...;
 * await storage.setItem('key', 123);
 * const value = await storage.getItem('key', 0);
 * ```
 *
 */
export interface AsyncStorage<Key, ValueType = unknown> {
  /**
   * The number of items stored.
   */
  readonly length: number;

  /**
   * Asynchronously stores a value with the specified key.
   *
   * @param key - The key to identify the stored value.
   * @param value - The value to store.
   * @param options - Optional parameters for storage.
   * @returns A promise that resolves when the value is stored.
   */
  setItem<T>(key: Key, value: T, options?: unknown): Promise<void>;

  /**
   * Asynchronously retrieves a value by key.
   *
   * @param key - The key of the value to retrieve.
   * @param defaultValue - The default value to return if the key is not found.
   * @param options - Optional parameters for retrieval.
   * @returns A promise that resolves to the value associated with the key, or the default value if not found.
   */
  getItem<T extends ValueType>(
    key: Key,
    defaultValue?: T,
    options?: unknown
  ): Promise<T | null>;

  /**
   * Asynchronously removes a value by key.
   *
   * @param key - The key of the value to remove.
   * @param options - Optional parameters for removal.
   * @returns A promise that resolves when the value is removed.
   */
  removeItem(key: Key, options?: unknown): Promise<void>;

  /**
   * Asynchronously clears all stored values.
   *
   * @returns A promise that resolves when all values are cleared.
   */
  clear(): Promise<void>;
}
