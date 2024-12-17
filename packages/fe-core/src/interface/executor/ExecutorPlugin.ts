import { ExecutorContext } from './ExecutorContext';
import { ExecutorError } from './ExecutorError';

/**
 * Type definition for promise-based task
 * @template T - Return type of the task
 * @template D - Input data type for the task
 * @example
 * ```typescript
 * const promiseTask: PromiseTask<string, number> = async (data: number) => {
 *   return `Result: ${data}`;
 * };
 * ```
 * @category ExecutorPlugin
 */
export type PromiseTask<Result, Params> = (
  context: ExecutorContext<Params>
) => Promise<Result>;

/**
 * Type definition for synchronous task
 * @template Result - Return type of the task
 * @template D - Input data type for the task
 * @example
 * ```typescript
 * const syncTask: SyncTask<string, number> = (data: number) => {
 *   return `Result: ${data}`;
 * };
 * ```
 * @category ExecutorPlugin
 */
export type SyncTask<Result, Params> = (
  context: ExecutorContext<Params>
) => Result;

/**
 * Union type for both promise and sync tasks
 * @template T - Return type of the task
 * @template D - Input data type for the task
 * @category ExecutorPlugin
 */
export type Task<Result, Params> =
  | PromiseTask<Result, Params>
  | SyncTask<Result, Params>;

/**
 * Base plugin class for extending executor functionality.
 *
 * Plugins provide a way to intercept and modify the execution flow at different stages:
 * - Before execution (onBefore)
 * - After successful execution (onSuccess)
 * - On error (onError)
 * - Custom execution logic (onExec)
 *
 * LifeCycle:
 *
 * **onBefore**
 *   - onBefore can modify the input data before it reaches the task, before exec is called.
 *   - The parameter of the first plugin's onBefore is the input data of exec.
 *   - The parameter of other plugins' onBefore is the return value of previous plugin's onBefore.
 *   - Also, not return value, will use first plugin's onBefore return value or exec's input data.
 *   - The parameter of the first plugin's onBefore is the input data of exec.
 *   - If any plugin's onBefore throws an error, it immediately stops the onBefore chain and enters the onError chain.
 *
 * **onExec**
 *   - onExec can modify the task before it is executed.
 *   - Use first plugin's onExec return value or exec's task.
 *   - The exec execution is only allowed to be modified once, so only the first onExec lifecycle method registered in the plugins list will be used.
 *
 * **onSuccess**
 *   - When call exec, onSuccess will be executed after onExec.
 *   - onSuccess accept the result of previous plugin's onSuccess, and can return a new result to the next plugin's onSuccess.
 *   - That means, if any plugin's onSuccess returns a new value, the next plugin's onSuccess will accept the value of previous plugin's onSuccess as parameter,
 *   - and can continue to return a new value, until the last plugin's onSuccess. The entire chain will not stop.
 *   - The parameter of the first plugin's onSuccess is the result of exec.
 *   - If any plugin's onSuccess throws an error, it immediately stops the onSuccess chain and enters the onError chain.
 *
 * **onError**
 *   - When an error occurs during call exec, all plugins' onError will be ordered executed.
 *   - After exec, all errors will be wrapped with ExecutorError.
 *   - If onError of any of the plugins returns an error, the error is thrown and the entire chain is stopped, but execNoError only return the error.
 *   - If any plugin's onError throws an error, it immediately stops the entire chain and throws the error, since errors in the error chain cannot be caught. Whether exec or execNoError.
 *   - If all plugins' onError neither return nor throw an error, wrapping raw Errors with ExecutorError and throw.
 *   - If execNoError is called, the first error encountered is returned, and the entire lifecycle is terminated.
 *
 *
 * **execNoError returns all errors as they are.**
 *
 * @template T - Type of data being processed
 * @template R - Type of result after processing
 *
 * @example
 * ```typescript
 * class LoggerPlugin extends ExecutorPlugin {
 *   onBefore(data: unknown) {
 *     console.log('Before execution:', data);
 *     return data;
 *   }
 *
 *   onSuccess(result: unknown) {
 *     console.log('Execution succeeded:', result);
 *     return result;
 *   }
 *
 *   onError(error: Error) {
 *     console.error('Execution failed:', error);
 *     throw error;
 *   }
 * }
 * ```
 * @category ExecutorPlugin
 */
export interface ExecutorPlugin<T = unknown, R = T> {
  /**
   * The pluginName of the plugin.
   *
   * Plugins with the same pluginName will be merged.
   */
  readonly pluginName: string;

  /**
   * Indicates if only one instance of this plugin should exist in the executor
   * When true, attempting to add duplicate plugins will result in a warning
   */
  readonly onlyOne?: boolean;

  /**
   * Controls whether the plugin is active for specific hook executions
   * @param name - Name of the hook being executed
   * @param args - Arguments passed to the hook
   * @returns Boolean indicating if the plugin should be executed
   *
   * @example
   * ```typescript
   * enabled(name: keyof ExecutorPlugin, context: ExecutorContextInterface<T>) {
   *   // Only enable for error handling
   *   return name === 'onError';
   * }
   * ```
   */
  enabled?(name: keyof ExecutorPlugin, context: ExecutorContext<T>): boolean;

  /**
   * Hook executed before the main task
   * Can modify the input data before it reaches the task
   * @param data - Input data
   * @returns Modified data or Promise of modified data
   */
  onBefore?(context: ExecutorContext<T>): unknown | Promise<unknown>;

  /**
   * Error handling hook
   * - For `exec`: returning a value or throwing will break the chain
   * - For `execNoError`: returning a value or throwing will return the error
   *
   * Because `onError` can break the chain, best practice is each plugin only handle plugin related error
   *
   * @param error - Error that occurred
   * @param data - Original input data
   * @returns ExecutorError, void, or Promise of either
   */
  onError?(
    context: ExecutorContext<T>
  ): Promise<ExecutorError | Error | void> | ExecutorError | Error | void;

  /**
   * Hook executed after successful task completion
   * Can transform the task result
   * @param result - Task execution result
   * @returns Modified result or Promise of modified result
   */
  onSuccess?(context: ExecutorContext<T>): R | Promise<R>;

  /**
   * Custom execution logic hook
   * Only the first plugin with onExec will be used
   * @param task - Task to be executed
   * @returns Task result or Promise of result
   */
  onExec?<Result, Params>(
    task: PromiseTask<Result, Params> | Task<Result, Params>
  ): Promise<Result | void> | Result | void;
}
