import { Serializer, SyncStorage } from '../../interface';
import { JSONSerializer } from '../serializer';

type JSONStorageValue<T> = {
  key: string;
  value: T;
  expire?: number;
};

/**
 * Represents a storage mechanism for JSON-serializable data.
 *
 * This class provides a way to store, retrieve, and manage JSON data
 * with optional expiration times. It can operate with a provided
 * synchronous storage backend or use an internal store.
 *
 * The main purpose of this class is to facilitate the storage of
 * complex data structures in a serialized JSON format, allowing
 * for easy retrieval and management.
 *
 * inner serializer is used by default, which is `JSONSerializer`.
 *
 * @since 1.0.17
 *
 * @example
 *
 * A simple example of how to use the JSONStorage class
 *
 * ```typescript
 * const storage = new JSONStorage();
 * storage.setItem('key', { data: 'value' }, 3600);
 * const value = storage.getItem('key');
 * // => { data: 'value' }
 * ```
 * @example
 *
 * If need persistent storage, you can use `localStorage` or `sessionStorage`
 *
 * ```typescript
 * const storage = new JSONStorage(localStorage);
 * storage.setItem('key', { data: 'value' }, 3600);
 * const value = storage.getItem('key');
 * // => { data: 'value' }
 * ```
 *
 * @example
 *
 * Or use custom serializer and storage
 *
 * ```typescript
 * // use native JSON
 * const customSerializer = {
 *   serialize: JSON.stringify,
 *   deserialize: JSON.parse,
 * };
 *
 * // can use localStorage or sessionStorage
 * const customStorage = {
 *   setItem: (key: string, value: string) => {
 *     localStorage.setItem(key, value);
 *   },
 *   getItem: (key: string) => {
 *     return localStorage.getItem(key);
 *   },
 *   removeItem: (key: string) => {
 *     localStorage.removeItem(key);
 *   },
 *   clear: () => {
 *     localStorage.clear();
 *   },
 * };
 *
 * const storage = new JSONStorage(customStorage, customSerializer);
 * storage.setItem('key', { data: 'value' }, 3600);
 * const value = storage.getItem('key');
 * ```
 *
 */
export class JSONStorage implements SyncStorage<string> {
  /**
   * The internal store for the JSONStorage class.
   *
   * If `storage` is not provided, it is stored in memory by default.
   */
  private store: Record<string, string> = {};

  /**
   * Initializes a new instance of the JSONStorage class.
   *
   * @param storage - An optional synchronous storage backend to use.
   */
  constructor(
    /**
     * The storage backend to use.
     */
    private readonly storage?: SyncStorage<string, string>,
    /**
     * The serializer used to serialize and deserialize the data.
     *
     * **serializer and deserialize is only support sync operation**
     */
    private readonly serializer: Serializer<
      unknown,
      string
    > = new JSONSerializer()
  ) {}

  /**
   * Gets the number of items stored in the local storage.
   *
   * @returns The number of stored items.
   */
  get length(): number {
    return this.storage ? this.storage.length : Object.keys(this.store).length;
  }

  /**
   * Stores a value with an optional expiration time.
   *
   * @param key - The key under which the value is stored.
   * @param value - The value to store, which must be JSON-serializable.
   * @param expire - Optional expiration time in milliseconds.
   */
  setItem<T>(key: string, value: T, expire?: number): void {
    const parameters = { key, value, expire } as JSONStorageValue<T>;

    if (typeof expire === 'number' && expire > 0) {
      parameters.expire = expire;
    }

    const valueString = this.serializer.serialize(parameters);
    if (this.storage) {
      this.storage.setItem(key, valueString);
      return;
    }

    this.store[key] = valueString;
  }

  /**
   * Retrieves a stored value by its key.
   *
   * @param key - The key of the value to retrieve.
   * @param defaultValue - An optional default value to return if the key is not found.
   * @returns The stored value or the default value if the key is not found or expired.
   */
  getItem<T>(key: string, defaultValue?: T): T | null {
    const item = this.storage ? this.storage.getItem(key) : this.store[key];
    const _dv = defaultValue ?? null;

    if (!item) {
      return _dv;
    }

    const value = this.serializer.deserialize(item, _dv) as JSONStorageValue<T>;

    if (typeof value === 'object') {
      if (typeof value.expire === 'number' && value.expire < Date.now()) {
        this.removeItem(key);
        return _dv;
      }

      return value?.value ?? _dv;
    }

    return _dv;
  }

  /**
   * Removes a stored item by its key.
   *
   * @param key - The key of the item to remove.
   */
  removeItem(key: string): void {
    if (this.storage) {
      this.storage.removeItem(key);
      return;
    }

    delete this.store[key];
  }

  /**
   * Clears all stored items.
   */
  clear(): void {
    if (this.storage) {
      this.storage.clear();
      return;
    }

    this.store = {};
  }
}
