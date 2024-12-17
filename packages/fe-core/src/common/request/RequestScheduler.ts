import {
  RequestAdapterInterface,
  RequestAdapterResponse,
  RequestAdpaterConfig,
  ExecutorPlugin
} from '../../interface';
import { AsyncExecutor } from '../executor';
import merge from 'merge';

/**
 * Represents a scheduler for managing HTTP requests.
 *
 * This class provides a unified API for making HTTP requests with support for plugins,
 * streaming responses, and request cancellation. Future enhancements may include caching,
 * upload/download progress, retries, timeouts, and mock data.
 *
 * @since 1.0.14
 * @example
 *
 * Create a Adapter
 *
 * ```typescript
 * class MockRequestAdapter implements RequestAdapterInterface<any> {
 * config: any;
 *
 * constructor(config: any = {}) {
 *   this.config = config;
 * }
 *
 * getConfig(): any {
 *   return this.config;
 * }
 * async request<Request, Response>(
 *   config: any
 * ): Promise<RequestAdapterResponse<Response, Request>> {
 *   const sendConfig = { ...this.config, ...config };
 *   await new Promise((resolve) => setTimeout(resolve, 1000));
 *
 *   return {
 *     status: 200,
 *     statusText: 'ok',
 *     headers: {},
 *     data: sendConfig.data,
 *     config: sendConfig
 *   };
 * }
 *
 * ```
 *
 * @example
 *
 * Execute a request using the adapter
 *
 * ```typescript
 * const adapter = new MockRequestAdapter();
 * const scheduler = new RequestScheduler();
 * const reqData = 'mock response';
 * const response = await scheduler.request({ url: '/test', data: reqData });
 * // => response.data is 'mock response'
 * ```
 *
 * @template Config - The configuration type extending RequestAdpaterConfig.
 */
export class RequestScheduler<Config extends RequestAdpaterConfig> {
  readonly executor: AsyncExecutor;

  /**
   * Initializes a new instance of the RequestScheduler class.
   *
   * @since 1.0.14
   *
   * @param adapter - The request adapter interface to be used for making requests.
   */
  constructor(readonly adapter: RequestAdapterInterface<Config>) {
    this.executor = new AsyncExecutor();
  }

  /**
   * Adds a plugin to the request execution process.
   *
   * @since 1.0.14
   *
   * @param plugin - The plugin to be used by the executor.
   * @returns The current instance of RequestScheduler for chaining.
   */
  usePlugin(plugin: ExecutorPlugin): this {
    this.executor.use(plugin);
    return this;
  }

  /**
   * Executes a request with the given configuration.
   *
   * @since 1.0.14
   *
   * @param config - The configuration for the request.
   * @returns A promise that resolves to the response of the request.
   */
  async request<Request, Response>(
    config: RequestAdpaterConfig<Request>
  ): Promise<RequestAdapterResponse<Response, Request>> {
    const thisConfig = this.adapter.getConfig();
    const mergedConfig = merge({}, thisConfig, config);
    return this.executor.exec(
      mergedConfig,
      (context) =>
        this.adapter.request<Request, Response>(
          context.parameters
        ) as unknown as Promise<RequestAdapterResponse<Response, Request>>
    );
  }

  /**
   * Executes a GET request.
   *
   * @param config - The configuration for the GET request.
   * @returns A promise that resolves to the response of the GET request.
   */
  async get<Request, Response>(
    config: RequestAdpaterConfig<Request>
  ): Promise<RequestAdapterResponse<Response, Request>> {
    return this.request<Request, Response>({ ...config, method: 'GET' });
  }

  /**
   * Executes a POST request.
   *
   * @param config - The configuration for the POST request.
   * @returns A promise that resolves to the response of the POST request.
   */
  async post<Request, Response>(
    config: RequestAdpaterConfig<Request>
  ): Promise<RequestAdapterResponse<Response, Request>> {
    return this.request<Request, Response>({ ...config, method: 'POST' });
  }

  /**
   * Executes a PUT request.
   *
   * @param config - The configuration for the PUT request.
   * @returns A promise that resolves to the response of the PUT request.
   */
  async put<Request, Response>(
    config: RequestAdpaterConfig<Request>
  ): Promise<RequestAdapterResponse<Response, Request>> {
    return this.request<Request, Response>({ ...config, method: 'PUT' });
  }

  /**
   * Executes a DELETE request.
   *
   * @param config - The configuration for the DELETE request.
   * @returns A promise that resolves to the response of the DELETE request.
   */
  async delete<Request, Response>(
    config: RequestAdpaterConfig<Request>
  ): Promise<RequestAdapterResponse<Response, Request>> {
    return this.request<Request, Response>({ ...config, method: 'DELETE' });
  }

  /**
   * Executes a PATCH request.
   *
   * @param config - The configuration for the PATCH request.
   * @returns A promise that resolves to the response of the PATCH request.
   */
  async patch<Request, Response>(
    config: RequestAdpaterConfig<Request>
  ): Promise<RequestAdapterResponse<Response, Request>> {
    return this.request<Request, Response>({ ...config, method: 'PATCH' });
  }

  /**
   * Executes a HEAD request.
   *
   * @param config - The configuration for the HEAD request.
   * @returns A promise that resolves to the response of the HEAD request.
   */
  async head<Request, Response>(
    config: RequestAdpaterConfig<Request>
  ): Promise<RequestAdapterResponse<Response, Request>> {
    return this.request<Request, Response>({ ...config, method: 'HEAD' });
  }

  /**
   * Executes an OPTIONS request.
   *
   * @param config - The configuration for the OPTIONS request.
   * @returns A promise that resolves to the response of the OPTIONS request.
   */
  async options<Request, Response>(
    config: RequestAdpaterConfig<Request>
  ): Promise<RequestAdapterResponse<Response, Request>> {
    return this.request<Request, Response>({ ...config, method: 'OPTIONS' });
  }

  /**
   * Executes a TRACE request.
   *
   * @param config - The configuration for the TRACE request.
   * @returns A promise that resolves to the response of the TRACE request.
   */
  async trace<Request, Response>(
    config: RequestAdpaterConfig<Request>
  ): Promise<RequestAdapterResponse<Response, Request>> {
    return this.request<Request, Response>({ ...config, method: 'TRACE' });
  }

  /**
   * Executes a CONNECT request.
   *
   * @param config - The configuration for the CONNECT request.
   * @returns A promise that resolves to the response of the CONNECT request.
   */
  async connect<Request, Response>(
    config: RequestAdpaterConfig<Request>
  ): Promise<RequestAdapterResponse<Response, Request>> {
    return this.request<Request, Response>({ ...config, method: 'CONNECT' });
  }
}
