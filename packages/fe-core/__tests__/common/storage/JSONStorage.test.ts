import { JSONStorage } from '../../../src/common/storage/JSONStorage';

describe('JSONStorage', () => {
  let storage: JSONStorage;

  beforeEach(() => {
    jest.useFakeTimers();
    storage = new JSONStorage();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should store and retrieve a value', () => {
    storage.setItem('key1', { data: 'value1' });
    const value = storage.getItem('key1');
    expect(value).toEqual({ data: 'value1' });
  });

  it('should return null for non-existent key', () => {
    const value = storage.getItem('nonExistentKey');
    expect(value).toBeNull();
  });

  it('should remove an item', () => {
    storage.setItem('key2', { data: 'value2' });
    storage.removeItem('key2');
    const value = storage.getItem('key2');
    expect(value).toBeNull();
  });

  it('should handle expiration', () => {
    const expireTime = Date.now() + 1000; // 1 second in the future
    storage.setItem('key3', { data: 'value3' }, expireTime);
    jest.advanceTimersByTime(1001); // Advance time by 1 second
    const value = storage.getItem('key3');
    expect(value).toBeNull();
  });

  it('should clear all items', () => {
    storage.setItem('key4', { data: 'value4' });
    storage.setItem('key5', { data: 'value5' });
    storage.clear();
    expect(storage.length).toBe(0);
  });

  it('should store and retrieve an empty object', () => {
    storage.setItem('emptyKey', {});
    const value = storage.getItem('emptyKey');
    expect(value).toEqual({});
  });

  it('should store and retrieve special characters', () => {
    const specialData = { data: '!@#$%^&*()_+{}:"<>?' };
    storage.setItem('specialKey', specialData);
    const value = storage.getItem('specialKey');
    expect(value).toEqual(specialData);
  });

  it('should handle removing a non-existent key gracefully', () => {
    expect(() => storage.removeItem('nonExistentKey')).not.toThrow();
  });

  it('should handle large data sets efficiently', () => {
    const largeData = Array.from({ length: 4000 }, (_, i) => ({ index: i }));
    storage.setItem('largeKey', largeData);
    const value = storage.getItem('largeKey');
    expect(value).toEqual(largeData);
  });
});
