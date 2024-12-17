import {
  ExecutorPlugin,
  RequestErrorID,
  RequestError,
  ExecutorContext
} from '../../../interface';
import { RequestAdapterFetchConfig } from '../adapter/RequestAdapterFetch';

/**
 * Plugin for handling request cancellation
 * Provides abort functionality for fetch requests
 *
 * - Core Idea: Enhance request management with cancellation capabilities.
 * - Main Function: Allow requests to be aborted programmatically.
 * - Main Purpose: Improve control over network requests and resource management.
 *
 * Features:
 * - Request cancellation support
 * - Automatic cleanup of aborted requests
 * - Multiple concurrent request handling
 * - Custom abort callbacks
 *
 * **Not Support**
 * - Abort signal from outside
 *
 * @implements {ExecutorPlugin}
 *
 * @example
 * ```typescript
 * // Basic usage
 * const abortPlugin = new AbortPlugin();
 * const client = new FetchRequest();
 * client.executor.use(abortPlugin);
 *
 * // Abort specific request
 * const config = { url: '/api/data' };
 * abortPlugin.abort(config);
 *
 * // Abort all pending requests
 * abortPlugin.abortAll();
 * ```
 */
export class FetchAbortPlugin implements ExecutorPlugin {
  readonly pluginName = 'FetchAbortPlugin';
  readonly onlyOne = true;

  /**
   * Map to store active AbortControllers
   * Keys are generated from request config
   */
  private controllers: Map<string, AbortController> = new Map();

  /**
   * Generates unique key for request identification
   * Combines method, URL, params, and body to create unique identifier
   *
   * @param config - Request configuration
   * @returns Unique request identifier
   *
   * @example
   * ```typescript
   * const key = abortPlugin.generateRequestKey(config);
   * ```
   */
  private generateRequestKey(config: RequestAdapterFetchConfig): string {
    const params = config.params ? JSON.stringify(config.params) : '';
    const data = config.body ? JSON.stringify(config.body) : '';
    return `${config.method || 'GET'}-${config.url}-${params}-${data}`;
  }

  /**
   * Pre-request hook that sets up abort handling
   * Creates new AbortController and cancels any existing request with same key
   *
   * @param config - Request configuration
   * @returns Modified configuration with abort control
   *
   * @example
   * ```typescript
   * const modifiedConfig = abortPlugin.onBefore(config);
   * ```
   */
  onBefore(context: ExecutorContext): RequestAdapterFetchConfig {
    const config = context.parameters as RequestAdapterFetchConfig;
    const key = this.generateRequestKey(config);

    // abort previous request
    if (this.controllers.has(key)) {
      this.abort(config);
    }

    // Check if config already has a signal
    if (!config.signal) {
      const controller = new AbortController();
      this.controllers.set(key, controller);

      // extends config with abort signal
      config.signal = controller.signal;
    }

    return config;
  }

  onSuccess(_: unknown, config?: RequestAdapterFetchConfig): void {
    // delete controller
    if (config) {
      this.controllers.delete(this.generateRequestKey(config));
    }
  }

  /**
   * Error handling hook for abort scenarios
   * Processes different types of abort errors and cleans up resources
   *
   * @param error - Original error
   * @param config - Request configuration
   * @returns RequestError or void
   *
   * @example
   * ```typescript
   * const error = abortPlugin.onError(new Error('AbortError'), config);
   * ```
   */
  onError(context: ExecutorContext): RequestError | void {
    const error = context.error as Error;
    const config = context.parameters as RequestAdapterFetchConfig;
    // only handle plugin related error，other error should be handled by other plugins
    if (this.isSameAbortError(error)) {
      if (config) {
        // controller may be deleted in .abort, this is will be undefined
        const key = this.generateRequestKey(config);
        const controller = this.controllers.get(key);
        this.controllers.delete(key);

        return new RequestError(
          RequestErrorID.ABORT_ERROR,
          controller?.signal.reason || error
        );
      }
    }
  }

  /**
   * Determines if the given error is an abort error.
   *
   * - Identify errors that are related to request abortion.
   * - Check error properties to determine if it's an abort error.
   * - Provide a unified method to recognize abort errors.
   *
   * @param error - The error to check
   * @returns True if the error is an abort error, false otherwise
   *
   */
  isSameAbortError(error: Error): boolean {
    // Check if the error is an instance of AbortError
    if (error instanceof Error && error.name === 'AbortError') {
      return true;
    }

    // Check for DOMException with abort-related message
    if (error instanceof DOMException && error.name === 'AbortError') {
      return true;
    }

    // Check for Event with auto trigger abort
    // use: signal.addEventListener('abort')
    if (error instanceof Event && error.type === 'abort') {
      return true;
    }

    // Add any additional conditions that signify an abort error
    // For example, custom error types or specific error codes

    return false;
  }

  /**
   * Aborts a specific request
   * Triggers abort callback if provided
   *
   * @param config - Configuration of request to abort
   *
   * @example
   * ```typescript
   * abortPlugin.abort({
   *   url: '/api/data',
   *   onAbort: (config) => {
   *     console.log('Request aborted:', config.url);
   *   }
   * });
   * ```
   */
  abort(config: RequestAdapterFetchConfig): void {
    const key = this.generateRequestKey(config);
    const controller = this.controllers.get(key);
    if (controller) {
      controller.abort(
        new RequestError(
          RequestErrorID.ABORT_ERROR,
          'The operation was aborted'
        )
      );
      // delete controller
      this.controllers.delete(key);
      config.onAbort?.(config);
    }
  }

  /**
   * Aborts all pending requests
   * Clears all stored controllers
   *
   * @example
   * ```typescript
   * // Cancel all requests when component unmounts
   * useEffect(() => {
   *   return () => abortPlugin.abortAll();
   * }, []);
   * ```
   */
  abortAll(): void {
    this.controllers.forEach((controller) => controller.abort());
    this.controllers.clear();
  }
}
