import axios from 'axios';
import { RequestAdapterAxios } from '../../../src/common/request/adapter';
import { RequestAdapterFetch } from '../../../src/common/request/adapter';
import { FetchResponseTypePlugin } from '../../../src/common/request/plugins';
import { RequestScheduler } from '../../../src/common/request/RequestScheduler';

async function checkNetworkConnection(): Promise<boolean> {
  try {
    await fetch('https://api.github.com', { method: 'HEAD' });
    return true;
  } catch {
    return false;
  }
}

describe.skip('Use RequestScheduler with network', () => {
  let hasNetwork: boolean;

  beforeAll(async () => {
    hasNetwork = await checkNetworkConnection();
    if (!hasNetwork) {
      console.warn('No network connection available, skipping network tests');
    }
  });

  it('should handle fetch response json type', async () => {
    if (!hasNetwork) {
      return;
    }

    const adapter = new RequestAdapterFetch();
    const scheduler = new RequestScheduler(adapter);

    scheduler.usePlugin(new FetchResponseTypePlugin());

    const response = await scheduler.request({
      url: 'https://api.github.com/users/octocat'
    });

    expect(response.status).toBe(200);
    expect(response.statusText).toBe('OK');
    expect(response.data).toBeDefined();
  });

  it('should handle axios response json type', async () => {
    if (!hasNetwork) {
      return;
    }

    const adapter = new RequestAdapterAxios(axios);
    const scheduler = new RequestScheduler(adapter);

    const response = await scheduler.request({
      url: 'https://api.github.com/users/octocat'
    });

    expect(response.status).toBe(200);
    expect(response.statusText).toBe('OK');
    expect(response.data).toBeDefined();
  });

  it('should handle fetch response stream type', async () => {
    if (!hasNetwork) {
      return;
    }

    const adapter = new RequestAdapterFetch();
    const scheduler = new RequestScheduler(adapter);

    scheduler.usePlugin(new FetchResponseTypePlugin());

    const response = await scheduler.request({
      url: 'https://httpbin.org/stream/2',
      responseType: 'stream'
    });

    expect(response.status).toBe(200);
    expect(response.statusText).toBe('OK');
    expect(response.data).toBeDefined();
  });

  it('should handle axios response stream type', async () => {
    if (!hasNetwork) {
      return;
    }

    const adapter = new RequestAdapterAxios(axios);
    const scheduler = new RequestScheduler(adapter);

    const response = await scheduler.request({
      url: 'https://httpbin.org/stream/2',
      responseType: 'stream'
    });

    expect(response.status).toBe(200);
    expect(response.statusText).toBe('OK');
    expect(response.data).toBeDefined();
  });
});
