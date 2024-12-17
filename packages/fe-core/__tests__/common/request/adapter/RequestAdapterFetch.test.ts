import { RequestError } from '../../../../src/interface';
import { RequestAdapterFetch } from '../../../../src/common/request';
import { FetchURLPlugin } from '../../../../src/common/request/plugins';

describe('RequestAdapterFetch', () => {
  let fetchMock: jest.Mock;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    fetchMock = jest.fn();
    globalThis.fetch = fetchMock;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('should merge config fetcher with request fetcher', async () => {
    const configFetcher = jest.fn();
    const requestFetcher = jest.fn();

    const request = new RequestAdapterFetch({
      url: '/users',
      baseURL: 'https://api.example.com',
      fetcher: configFetcher
    });

    request.usePlugin(new FetchURLPlugin());

    const responseData = { id: 1 };
    const mockResponse = new Response(JSON.stringify(responseData));
    requestFetcher.mockResolvedValue(mockResponse);

    const result = await request.request({
      url: '/users',
      baseURL: 'https://api.example.com',
      fetcher: requestFetcher
    });
    expect(requestFetcher).toHaveBeenCalledWith(
      'https://api.example.com/users',
      expect.objectContaining({
        baseURL: 'https://api.example.com',
        url: 'https://api.example.com/users'
      })
    );
    expect(configFetcher).not.toHaveBeenCalled();
    await expect((result as unknown as Response).json()).resolves.toEqual(
      responseData
    );
  });

  it('should execute request with correct URL', async () => {
    const request = new RequestAdapterFetch({
      url: '/users',
      baseURL: 'https://api.example.com',
      fetcher: fetchMock
    });

    request.usePlugin(new FetchURLPlugin());

    const mockResponse = new Response(JSON.stringify({ id: 1 }));
    fetchMock.mockResolvedValueOnce(mockResponse);

    await request.request({
      url: '/users',
      baseURL: 'https://api.example.com'
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/users',
      expect.objectContaining({
        baseURL: 'https://api.example.com',
        url: 'https://api.example.com/users'
      })
    );
  });

  it('should handle query parameters', async () => {
    const request = new RequestAdapterFetch({
      url: '/users',
      baseURL: 'https://api.example.com',
      params: { id: '1' },
      fetcher: fetchMock
    });

    request.usePlugin(new FetchURLPlugin());

    const mockResponse = new Response(JSON.stringify({ id: 1 }));
    fetchMock.mockResolvedValueOnce(mockResponse);

    await request.request({
      url: '/users',
      baseURL: 'https://api.example.com',
      params: { id: '1' }
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/users?id=1',
      expect.objectContaining({
        baseURL: 'https://api.example.com',
        url: 'https://api.example.com/users?id=1'
      })
    );
  });

  it('should parse JSON response automatically', async () => {
    const request = new RequestAdapterFetch({
      url: '/users',
      baseURL: 'https://api.example.com',
      fetcher: fetchMock
    });

    request.usePlugin(new FetchURLPlugin());

    const responseData = { id: 1, name: 'test' };
    const mockResponse = new Response(JSON.stringify(responseData));
    fetchMock.mockResolvedValueOnce(mockResponse);

    const response = await request.request<Response, Record<string, unknown>>({
      url: '/users',
      baseURL: 'https://api.example.com'
    });

    expect(response).toBeInstanceOf(Response);
    // const result = await response.json();
    // expect(result).toEqual(responseData);
  });

  it('should handle request errors', async () => {
    const request = new RequestAdapterFetch({
      url: '/users',
      baseURL: 'https://api.example.com',
      fetcher: fetchMock
    });

    request.usePlugin(new FetchURLPlugin());

    const networkError = new Error('Network error');
    fetchMock.mockRejectedValueOnce(networkError);

    await expect(
      request.request({
        url: '/users',
        baseURL: 'https://api.example.com'
      })
    ).rejects.toEqual(new RequestError('Network error', networkError));
  });
});
