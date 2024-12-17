import { FetchURLPlugin } from '../../../../src/common';

describe('FetchURLPlugin', () => {
  let plugin: FetchURLPlugin;

  beforeEach(() => {
    plugin = new FetchURLPlugin();
  });

  describe('isFullURL', () => {
    it('should correctly identify full URLs', () => {
      expect(plugin.isFullURL('http://example.com')).toBe(true);
      expect(plugin.isFullURL('https://example.com')).toBe(true);
      expect(plugin.isFullURL('/api/users')).toBe(false);
      expect(plugin.isFullURL('api/users')).toBe(false);
    });
  });

  describe('appendQueryParams', () => {
    it('should correctly append query parameters', () => {
      const url = 'https://api.example.com/users';
      const params = { id: '1', name: 'test' };
      const result = plugin.appendQueryParams(url, params);
      const resultUrl = new URL(result);
      expect(resultUrl.origin + resultUrl.pathname).toBe(
        'https://api.example.com/users'
      );
      expect(resultUrl.searchParams.get('id')).toBe('1');
      expect(resultUrl.searchParams.get('name')).toBe('test');
    });

    it('should merge existing query parameters', () => {
      const url = 'https://api.example.com/users?page=1';
      const params = { size: '10' };
      const result = plugin.appendQueryParams(url, params);
      const resultUrl = new URL(result);
      expect(resultUrl.origin + resultUrl.pathname).toBe(
        'https://api.example.com/users'
      );
      expect(resultUrl.searchParams.get('page')).toBe('1');
      expect(resultUrl.searchParams.get('size')).toBe('10');
    });
  });

  describe('buildUrl', () => {
    it('should correctly build URL with baseURL', () => {
      const config = {
        url: '/users',
        baseURL: 'https://api.example.com'
      };
      const result = plugin.buildUrl(config);
      expect(result).toBe('https://api.example.com/users');
    });

    it('should handle slashes in baseURL and path', () => {
      const config = {
        url: '/users/',
        baseURL: 'https://api.example.com/'
      };
      const result = plugin.buildUrl(config);
      expect(result.replace(/\/$/, '')).toBe('https://api.example.com/users');
    });

    it('should preserve full URLs', () => {
      const config = {
        url: 'https://other.example.com/api',
        baseURL: 'https://api.example.com'
      };
      const result = plugin.buildUrl(config);
      expect(result).toBe('https://other.example.com/api');
    });

    it('should add query parameters', () => {
      const config = {
        url: '/users',
        baseURL: 'https://api.example.com',
        params: { id: '1', name: 'test' }
      };
      const result = plugin.buildUrl(config);
      const resultUrl = new URL(result);
      expect(resultUrl.origin + resultUrl.pathname).toBe(
        'https://api.example.com/users'
      );
      expect(resultUrl.searchParams.get('id')).toBe('1');
      expect(resultUrl.searchParams.get('name')).toBe('test');
    });
  });
});
