import { RequestAdapterAxios } from '../../../../src/common/request/adapter/RequestAdapterAxios';
import axios from 'axios';

jest.mock('axios');

describe('RequestAdapterAxios', () => {
  let axiosMock: jest.Mocked<typeof axios>;

  beforeEach(() => {
    axiosMock = axios as jest.Mocked<typeof axios>;
    axiosMock.create.mockReturnThis();
  });

  it('should create an axios instance with given config', () => {
    const config = { baseURL: 'https://api.example.com' };
    const adapter = new RequestAdapterAxios(axios, config);

    expect(axiosMock.create).toHaveBeenCalledWith(config);
    expect(adapter.getConfig()).toEqual(config);
  });

  it('should return the correct config', () => {
    const config = { baseURL: 'https://api.example.com' };
    const adapter = new RequestAdapterAxios(axios, config);

    expect(adapter.getConfig()).toEqual(config);
  });

  it('should make a request and return a response', async () => {
    const responseData = { data: { id: 1 } };
    axiosMock.request.mockResolvedValue(responseData);

    const adapter = new RequestAdapterAxios(axios);
    const response = await adapter.request({ url: '/users' });

    expect(axiosMock.request).toHaveBeenCalledWith({ url: '/users' });
    expect(response).toEqual(responseData);
  });

  it('should handle request errors', async () => {
    const error = new Error('Network Error');
    axiosMock.request.mockRejectedValue(error);

    const adapter = new RequestAdapterAxios(axios);

    await expect(adapter.request({ url: '/users' })).rejects.toThrow(
      'Network Error'
    );
  });
});
