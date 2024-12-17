import {
  ExecutorPlugin,
  ExecutorContext,
  RequestError,
  RequestErrorID,
  RequestAdpaterConfig
} from '../../../interface';

/**
 * Plugin for URL manipulation and response handling
 * Provides URL composition and response status checking
 *
 * - Core Idea: Simplify URL handling and response validation.
 * - Main Function: Manage URL construction and check response status.
 * - Main Purpose: Ensure correct URL formation and response handling.
 *
 * Features:
 * - URL normalization
 * - Base URL handling
 * - Query parameter management
 * - Response status validation
 *
 * @implements {ExecutorPlugin}
 *
 * @example
 * ```typescript
 * // Basic usage
 * const urlPlugin = new FetchURLPlugin();
 * const client = new FetchRequest();
 * client.executor.use(urlPlugin);
 *
 * // Request with base URL and params
 * await client.get({
 *   baseURL: 'https://api.example.com',
 *   url: '/users',
 *   params: { role: 'admin' }
 * });
 * ```
 */
export class FetchURLPlugin implements ExecutorPlugin {
  readonly pluginName = 'FetchURLPlugin';
  /**
   * Checks if URL is absolute (starts with http:// or https://)
   *
   * @param url - URL to check
   * @returns Boolean indicating if URL is absolute
   *
   * @example
   * ```typescript
   * const isAbsolute = urlPlugin.isFullURL('https://example.com');
   * ```
   */
  isFullURL(url: string): boolean {
    return url.startsWith('http://') || url.startsWith('https://');
  }

  /**
   * Appends query parameters to URL
   * Handles existing query parameters in URL
   *
   * @param url - Base URL
   * @param params - Parameters to append
   * @returns URL with query parameters
   *
   * @example
   * ```typescript
   * const url = urlPlugin.appendQueryParams(
   *   'https://api.example.com/users',
   *   { role: 'admin', status: 'active' }
   * );
   * ```
   */
  appendQueryParams(url: string, params: Record<string, unknown> = {}): string {
    const opt = '?';
    const link = '&';
    const [path, search = ''] = url.split(opt);

    search.split(link).forEach((item) => {
      const [key, value] = item.split('=');
      if (key && value) {
        params[key] = value;
      }
    });

    const queryString = Object.entries(params)
      .map(([key, value]) => `${key}=${value}`)
      .join('&');

    return [path, queryString].join(opt);
  }

  /**
   * Combines base URL with path.
   *
   * Ensures proper slash handling
   *
   * @param url - URL path
   * @param baseURL - Base URL
   * @returns Combined URL
   *
   * @example
   * ```typescript
   * const fullUrl = urlPlugin.connectBaseURL('/users', 'https://api.example.com');
   * ```
   */
  connectBaseURL(url: string, baseURL: string): string {
    return `${baseURL}/${url}`;
  }

  /**
   * Builds complete URL from configuration.
   *
   * Handles base URL, path normalization, and query parameters.
   *
   * @param config - Request configuration
   * @returns Complete URL
   *
   * @example
   * ```typescript
   * const completeUrl = urlPlugin.buildUrl(config);
   * ```
   */
  buildUrl(config: RequestAdpaterConfig): string {
    let { url = '' } = config;
    const { baseURL = '', params } = config;

    // has full url
    if (!this.isFullURL(url)) {
      // normalize baseUrl and path, only one slash
      const normalizedPath = url.startsWith('/') ? url.slice(1) : url;
      const normalizedBaseUrl = baseURL.endsWith('/')
        ? baseURL.slice(0, -1)
        : baseURL;
      url = this.connectBaseURL(normalizedPath, normalizedBaseUrl);
    }

    // handle params
    if (params && Object.keys(params).length > 0) {
      url = this.appendQueryParams(url, params);
    }

    return url;
  }

  /**
   * Pre-request hook that builds complete URL
   *
   * @param config - Request configuration
   *
   * @example
   * ```typescript
   * urlPlugin.onBefore(config);
   * ```
   */
  onBefore(context: ExecutorContext<RequestAdpaterConfig>): void {
    // compose url and params
    context.parameters.url = this.buildUrl(context.parameters);
  }

  /**
   * Success hook that validates response status
   * Throws error for non-OK responses
   *
   * @param result - Fetch response
   * @returns Response if OK
   * @throws {RequestError} If response is not OK
   *
   * @example
   * ```typescript
   * const response = urlPlugin.onSuccess(fetchResponse);
   * ```
   */
  onSuccess(context: ExecutorContext): Response {
    const result = context.returnValue as Response;
    // if response is not ok, throw error
    if (!result.ok) {
      const requestError = new RequestError(
        RequestErrorID.RESPONSE_NOT_OK,
        `Request failed with status: ${result.status} ${result.statusText}`
      );

      // @ts-expect-error Experimental: add response to error
      requestError.response = result;

      throw requestError;
    }

    return result;
  }

  /**
   * Error handling hook
   * Wraps non-RequestError errors
   *
   * @param error - Original error
   * @returns RequestError
   *
   * @example
   * ```typescript
   * const error = urlPlugin.onError(new Error('Network Error'));
   * ```
   */
  onError(context: ExecutorContext): RequestError {
    const error = context.error as Error;
    return error instanceof RequestError
      ? error
      : new RequestError(RequestErrorID.REQUEST_ERROR, error);
  }
}
