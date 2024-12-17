import {
  RequestAdapterInterface,
  RequestAdapterResponse,
  RequestAdpaterConfig,
  ExecutorError,
  ExecutorPlugin,
  RequestErrorID
} from '../../../interface';
import { AsyncExecutor } from '../../executor';
import { merge } from 'merge';

/**
 * Request adapter fetch configuration
 *
 * This type defines the configuration options for a request adapter.
 * It includes properties for URL, method, headers, and other request details.
 * The main purpose is to provide a flexible structure for configuring HTTP requests.
 *
 * @since 1.0.14
 */
export type RequestAdapterFetchConfig<Request = unknown> =
  globalThis.RequestInit &
    RequestAdpaterConfig<Request> & {
      fetcher?: typeof fetch;

      onStreamProgress?: (progress: number) => void;

      signal?: AbortSignal;

      onAbort?(config: RequestAdapterFetchConfig): void;
    };

export class RequestAdapterFetch
  implements RequestAdapterInterface<RequestAdapterFetchConfig>
{
  readonly config: RequestAdapterFetchConfig;
  private executor: AsyncExecutor;

  /**
   * Creates a new FetchRequest instance
   * Automatically detects and configures fetch implementation
   *
   * - Core Idea: Simplify HTTP requests with built-in fetch support.
   * - Main Function: Initialize fetch requests with optional configuration.
   * - Main Purpose: Provide a flexible and extensible HTTP request utility.
   *
   * @param config - Request configuration options
   * @throws {FetchRequestError} When fetch is not available
   *
   * @example
   * ```typescript
   * const fetchRequest = new FetchRequest({ baseURL: 'https://api.example.com' });
   * ```
   */
  constructor(config: Partial<RequestAdapterFetchConfig> = {}) {
    if (!config.fetcher) {
      if (typeof fetch !== 'function') {
        throw new ExecutorError(RequestErrorID.ENV_FETCH_NOT_SUPPORT);
      }

      config.fetcher = fetch;
    }

    // use AsyncExecutor
    this.executor = new AsyncExecutor();

    this.config = config as RequestAdapterFetchConfig;
  }

  getConfig(): RequestAdapterFetchConfig {
    return this.config;
  }

  usePlugin(plugin: ExecutorPlugin): void {
    this.executor.use(plugin);
  }

  /**
   * Core request implementation
   * Merges configurations and executes fetch request
   *
   * - Core Idea: Execute HTTP requests with merged configurations.
   * - Main Function: Perform fetch requests using provided configurations.
   * - Main Purpose: Facilitate HTTP communication with error handling.
   *
   * @override
   * @param config - Request configuration
   * @returns Promise resolving to Response object
   * @throws {FetchRequestError} When fetcher is not available
   *
   * @example
   * ```typescript
   * const response = await fetchRequest.request({ url: '/data' });
   * ```
   */
  async request<Request, Response>(
    config: RequestAdapterFetchConfig<Request>
  ): Promise<RequestAdapterResponse<Request, Response>> {
    const thisConfig = this.getConfig();
    const mergedConfig = merge({}, thisConfig, config);
    const { fetcher, ...rest } = mergedConfig;

    if (typeof fetcher !== 'function') {
      throw new ExecutorError(RequestErrorID.FETCHER_NONE);
    }

    if (!rest.url) {
      throw new ExecutorError(RequestErrorID.URL_NONE);
    }

    return this.executor.exec(rest, (context) =>
      // TODO: fix fetcher second parameter type
      fetcher(context.parameters.url as string, context.parameters)
    ) as unknown as Promise<RequestAdapterResponse<Request, Response>>;
  }
}
