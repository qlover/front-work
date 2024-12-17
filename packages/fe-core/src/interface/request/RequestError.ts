import { ExecutorError } from '../executor';

/**
 * Represents a custom error class for handling request-related errors in the application
 *
 * RequestError extends the base ExecutorError class to provide specific error handling
 * for HTTP requests and fetch operations. It works in conjunction with RequestErrorID
 * to categorize different types of request failures.
 *
 * @since 1.0.14
 *
 * @example
 * ```typescript
 * try {
 *   await fetchData(url);
 * } catch (error) {
 *   if (error instanceof RequestError) {
 *     // Handle request specific error
 *     console.error('Request failed:', error.message);
 *   }
 * }
 * ```
 */
export class RequestError extends ExecutorError {}

/**
 * Error IDs for different fetch request failure scenarios
 * Used to identify specific error types in error handling
 *
 * @description
 * This enum provides a standardized set of error identifiers that can be used
 * to categorize and handle different types of request failures in a consistent manner.
 * Each error ID represents a specific failure scenario that might occur during HTTP requests.
 *
 * @example
 * ```typescript
 * if (error.id === RequestErrorID.RESPONSE_NOT_OK) {
 *   // Handle non-200 response
 * } else if (error.id === RequestErrorID.ABORT_ERROR) {
 *   // Handle aborted request
 * }
 * ```
 */
export enum RequestErrorID {
  /** Generic fetch request error */
  REQUEST_ERROR = 'REQUEST_ERROR',
  /** Environment doesn't support fetch API */
  ENV_FETCH_NOT_SUPPORT = 'ENV_FETCH_NOT_SUPPORT',
  /** No fetcher function provided */
  FETCHER_NONE = 'FETCHER_NONE',
  /** Response status is not OK (not in 200-299 range) */
  RESPONSE_NOT_OK = 'RESPONSE_NOT_OK',
  /** Request was aborted */
  ABORT_ERROR = 'ABORT_ERROR',
  /** URL is not provided */
  URL_NONE = 'URL_NONE'
}
