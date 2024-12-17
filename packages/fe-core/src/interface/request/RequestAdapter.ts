/**
 * Request adapter configuration
 *
 * This type defines the configuration options for a request adapter.
 * It includes properties for URL, method, headers, and other request details.
 * The main purpose is to provide a flexible structure for configuring HTTP requests.
 *
 * @since 1.0.14
 */
export type RequestAdpaterConfig<RequestData = unknown> = {
  /**
   * Request URL path
   * Will be combined with baseURL if provided
   *
   * Processed by FetchURLPlugin during request
   *
   * @todo Change to URL | Request, add attribute `input`
   * @example
   * ```typescript
   * url: '/users/1'
   * ```
   */
  url?: string;

  /**
   * HTTP request methods supported by the executor
   * Follows standard HTTP method definitions
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods
   * @example
   * ```typescript
   * method: 'GET'
   * ```
   */
  method?: string;

  /**
   * Base URL for all requests
   * Will be prepended to the request URL
   *
   * @example
   * ```typescript
   * baseURL: 'https://api.example.com'
   * // url = /users/1 => https://api.example.com/users/1
   * // url = users/1 => https://api.example.com/users/1
   * ```
   */
  baseURL?: string;

  /**
   * Request body data
   *
   * @typeParam RequestData - The type of the request body data.
   * @example
   * ```typescript
   * data: { name: 'John Doe' }
   * ```
   */
  data?: RequestData;

  /**
   * URL query parameters
   * Will be serialized and appended to the URL
   *
   * @example
   * ```typescript
   * params: { search: 'query' }
   * ```
   */
  params?: Record<string, unknown>;

  /**
   * Request headers
   *
   * @example
   * ```typescript
   * headers: { 'Content-Type': 'application/json' }
   * ```
   */
  headers?: { [key: string]: unknown };

  /**
   * Response type
   *
   * Specifies the type of data that the server will respond with.
   *
   * @example
   * ```typescript
   * responseType: 'json'
   * ```
   */
  responseType?:
    | 'arraybuffer'
    | 'blob'
    | 'document'
    | 'json'
    | 'text'
    | 'stream'
    | 'formdata';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

/**
 * Request adapter response
 *
 * This type defines the structure of a response from a request adapter.
 * It includes the response data, status, headers, and the original request configuration.
 *
 * @typeParam Req - The type of the request data.
 * @typeParam Res - The type of the response data.
 */
export type RequestAdapterResponse<Req = unknown, Res = unknown> = {
  data: Res;
  status: number;
  statusText: string;
  headers: { [key: string]: unknown };
  config: RequestAdpaterConfig<Req>;

  [key: string]: unknown;
};

/**
 * Request adapter interface
 *
 * This interface defines the contract for request adapters.
 * Adapters are responsible for handling the specific details of a request,
 * such as URL construction, headers, and response handling.
 *
 */
export interface RequestAdapterInterface<Config extends RequestAdpaterConfig> {
  /**
   * The configuration for the request adapter.
   *
   * @type {Config}
   */
  readonly config: Config;

  /**
   * Sends a request using the specified options and returns a promise with the response.
   *
   * @typeParam Request - The type of the request data.
   * @typeParam Response - The type of the response data.
   * @param options - The configuration options for the request.
   * @returns A promise that resolves to the response of the request.
   * @example
   * ```typescript
   * adapter.request({ url: '/users', method: 'GET' }).then(response => console.log(response));
   * ```
   */
  request<Request, Response>(
    options: RequestAdpaterConfig<Request>
  ): Promise<RequestAdapterResponse<Request, Response>>;

  /**
   * Retrieves the current configuration of the request adapter.
   *
   * @returns The current configuration.
   * @example
   * ```typescript
   * const config = adapter.getConfig();
   * ```
   */
  getConfig: () => Config;
}
