import {
  RequestErrorID,
  RequestError,
  ExecutorPlugin
} from '../../../../src/interface';
import { RequestAdapterFetch, FetchAbortPlugin } from '../../../../src/common';

function sleep(mock: unknown, ms: number): Promise<unknown> {
  return new Promise((resolve) => setTimeout(() => resolve(mock), ms));
}

describe('FetchAbortPlugin', () => {
  let fetchMock: jest.Mock;
  let originalFetch: typeof globalThis.fetch;
  let request: RequestAdapterFetch;
  let abortPlugin: FetchAbortPlugin;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    fetchMock = jest.fn();
    globalThis.fetch = fetchMock;

    request = new RequestAdapterFetch({
      fetcher: fetchMock
    });

    abortPlugin = new FetchAbortPlugin();
    request.usePlugin(abortPlugin);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.clearAllMocks();
    abortPlugin.abortAll();
  });

  it('should abort previous request when making same request', async () => {
    const onAbortMock = jest.fn();

    const firstConfig = {
      url: '/api/test0',
      method: 'GET',
      onAbort: onAbortMock
    } as const;

    // mock a fetch implementation that can respond to abort
    fetchMock.mockImplementationOnce(
      (_url, options: globalThis.RequestInit) => {
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            resolve(new Response('first response'));
          }, 1000);

          options.signal?.addEventListener('abort', (e) => {
            clearTimeout(timeoutId);
            reject(e);
          });
        });
      }
    );

    const firstRequest = request.request(firstConfig);

    // wait for a while to ensure the request starts
    await sleep(null, 500);

    abortPlugin.abort(firstConfig);

    // verify the request is aborted
    try {
      await firstRequest;

      fail('Request should have been aborted');
    } catch (error: unknown) {
      expect(error).toMatchObject({
        id: RequestErrorID.ABORT_ERROR
      });
      expect(onAbortMock).toHaveBeenCalledTimes(1);
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('should not abort different requests', async () => {
    const firstResponse = 'first response';
    const secondResponse = 'second response';

    // mock `RequestAdapterResponse` type
    fetchMock
      .mockImplementationOnce(() => Promise.resolve({ data: firstResponse }))
      .mockImplementationOnce(() => Promise.resolve({ data: secondResponse }));

    const firstRequest = request.request({
      url: '/api/test1',
      method: 'GET'
    });

    const secondRequest = request.request({
      url: '/api/test2',
      method: 'GET'
    });

    const [first, second] = await Promise.all([firstRequest, secondRequest]);

    expect(first.data).toEqual(firstResponse);
    expect(second.data).toEqual(secondResponse);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('should auto abort request with same URL', async () => {
    const onAbortMock = jest.fn();

    fetchMock.mockImplementation((_url, options: globalThis.RequestInit) => {
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          resolve(new Response('response'));
        }, 1000);

        options.signal?.addEventListener('abort', (e) => {
          clearTimeout(timeoutId);
          reject(e);
        });
      });
    });

    const config = {
      url: '/api/test4',
      method: 'GET',
      onAbort: onAbortMock
    } as const;

    const firstRequest = request.request(config);
    await sleep(null, 100);

    const secondRequest = request.request(config);

    const results = await Promise.allSettled([firstRequest, secondRequest]);

    expect(results[0].status).toBe('rejected');
    if (results[0].status === 'rejected') {
      expect(results[0].reason).toMatchObject({
        id: RequestErrorID.ABORT_ERROR
      });
    }

    expect(results[1].status).toBe('fulfilled');
    if (results[1].status === 'fulfilled') {
      expect(results[1].value).toBeInstanceOf(Response);
    }

    expect(onAbortMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('FetchAbortPlugin with multiple plugins', () => {
  it('should handle abort error correctly with multiple plugins(before)', async () => {
    const fetchMock = jest.fn();
    const request = new RequestAdapterFetch({
      fetcher: fetchMock
    });
    const abortPlugin = new FetchAbortPlugin();
    const TestErrorPlugin: ExecutorPlugin = {
      pluginName: 'TestErrorPlugin',
      onError: jest.fn((error: unknown): RequestError => {
        return new RequestError(
          RequestErrorID.ABORT_ERROR,
          'TestErrorPlugin abort'
        );
      })
    };
    request.usePlugin(TestErrorPlugin);
    request.usePlugin(abortPlugin);

    const onAbortMock = jest.fn();

    const config = {
      url: '/api/test-multi-plugin',
      method: 'GET',
      onAbort: onAbortMock
    } as const;

    fetchMock.mockImplementationOnce(
      (_url, options: globalThis.RequestInit) => {
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            resolve(new Response('response'));
          }, 1000);

          options.signal?.addEventListener('abort', (e) => {
            clearTimeout(timeoutId);
            reject(e);
          });
        });
      }
    );

    const requestPromise = request.request(config);

    // wait for a while to ensure the request starts
    await sleep(null, 100);

    // Simulate abort
    abortPlugin.abort(config);

    // Verify the request is aborted and custom plugin handles the error
    try {
      await requestPromise;

      fail('Request should have been aborted');
    } catch (error: unknown) {
      expect((error as RequestError).id).toBe(RequestErrorID.ABORT_ERROR);
      expect((error as RequestError).message).toBe('TestErrorPlugin abort');
      expect(onAbortMock).toHaveBeenCalledTimes(1);
    }

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(TestErrorPlugin.onError).toHaveBeenCalledTimes(1);
  });

  it('should handle abort error correctly with multiple plugins(after)', async () => {
    const fetchMock = jest.fn();
    const request = new RequestAdapterFetch({
      fetcher: fetchMock
    });
    const abortPlugin = new FetchAbortPlugin();
    const TestErrorPlugin: ExecutorPlugin = {
      pluginName: 'TestErrorPlugin',
      onError: jest.fn((error: unknown): RequestError => {
        return new RequestError(
          RequestErrorID.ABORT_ERROR,
          'TestErrorPlugin abort'
        );
      })
    };

    request.usePlugin(abortPlugin);
    request.usePlugin(TestErrorPlugin);

    const onAbortMock = jest.fn();

    const config = {
      url: '/api/test-multi-plugin',
      method: 'GET',
      onAbort: onAbortMock
    } as const;

    fetchMock.mockImplementationOnce(
      (_url, options: globalThis.RequestInit) => {
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            resolve(new Response('response'));
          }, 1000);

          options.signal?.addEventListener('abort', (e: unknown) => {
            clearTimeout(timeoutId);
            reject(e);
          });
        });
      }
    );

    const requestPromise = request.request(config);

    // wait for a while to ensure the request starts
    await sleep(null, 100);

    // Simulate abort
    abortPlugin.abort(config);

    // Verify the request is aborted and custom plugin handles the error
    try {
      await requestPromise;

      fail('Request should have been aborted');
    } catch (error: unknown) {
      expect((error as RequestError).id).toBe(RequestErrorID.ABORT_ERROR);
      expect(onAbortMock).toHaveBeenCalledTimes(1);
    }

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(TestErrorPlugin.onError).toHaveBeenCalledTimes(0);
  });
});
