import { AxiosInstance, AxiosRequestConfig, AxiosStatic } from 'axios';
import {
  RequestAdapterInterface,
  RequestAdapterResponse
} from '../../../interface';

/**
 * Axios request adapter
 *
 * Only base config is supported
 *
 * @since 1.0.14
 */
export class RequestAdapterAxios
  implements RequestAdapterInterface<AxiosRequestConfig>
{
  private axiosInstance: AxiosInstance;
  constructor(
    axios: AxiosStatic,
    readonly config: AxiosRequestConfig = {}
  ) {
    this.axiosInstance = axios.create(config);
  }

  getConfig(): AxiosRequestConfig {
    return this.config;
  }

  async request<Request, Response>(
    config: AxiosRequestConfig<Request>
  ): Promise<RequestAdapterResponse<Request, Response>> {
    return this.axiosInstance.request(config) as unknown as Promise<
      RequestAdapterResponse<Request, Response>
    >;
  }
}
