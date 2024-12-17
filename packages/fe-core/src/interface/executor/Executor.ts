import { ExecutorError } from './ExecutorError';
import { ExecutorPlugin, Task } from './ExecutorPlugin';

/**
 * Configuration interface for executor
 *
 * - Purpose: Provides configuration options for the Executor class
 * - Core Concept: Extensible configuration container
 * - Main Features: Currently empty but designed for future extension
 * - Primary Use: Allows customization of executor behavior
 *
 * @category Executor
 * @example
 *
 * Successfully execute an asynchronous task
 *
 * ```typescript
 * const executor = new AsyncExecutor();
 * const result = await executor.exec(async () => 'success');
 *
 * // => result is 'success'
 * ```
 *
 * @example
 *
 * Execute multiple plugins in order
 *
 * ```typescript
 * const executor = new AsyncExecutor();
 * const steps: number[] = [];
 *
 * const plugin1: ExecutorPlugin = {
 *   pluginName: 'test1',
 *   onSuccess: () => {
 *     steps.push(1);
 *   }
 * };
 *
 *  const plugin2: ExecutorPlugin = {
 *    pluginName: 'test2',
 *    onSuccess: () => {
 *      steps.push(2);
 *    }
 *  };
 *
 *  executor.use(plugin1);
 *  executor.use(plugin2);
 *
 *  await executor.exec(async () => 'test');
 *
 *  // => steps is [1, 2]
 * ```
 *
 * @example
 *
 * If a plugin returns undefined, the chain should continue
 *
 * ```typescript
 * const executor = new AsyncExecutor();
 * let finalResult = '';
 *
 * const plugin1: ExecutorPlugin = {
 *   pluginName: 'test1',
 *   onSuccess: (): undefined => undefined
 * };
 *
 * const plugin2: ExecutorPlugin = {
 *   pluginName: 'test2',
 *   onSuccess: ({ returnValue }) => {
 *     finalResult = returnValue + ' modified';
 *     return finalResult;
 *   }
 * };
 *
 * executor.use(plugin1);
 * executor.use(plugin2);
 *
 * const result = await executor.exec(async () => 'test');
 *
 * // => result is 'test modified'
 * ```
 */
export interface ExecutorConfig {}

/**
 * Base executor class providing plugin management and execution pipeline
 *
 * The Executor pattern implements a pluggable execution pipeline that allows:
 * 1. Pre-processing of input data
 * 2. Post-processing of results
 * 3. Error handling
 * 4. Custom execution logic
 *
 * execNoError returns all errors as they are., and if there is a plugin onerror handler chain in which an error occurs, it will also return the error instead of throwing it.
 *
 * @abstract
 * @class Executor
 * @category Executor
 * @example
 * ```typescript
 * // Create an executor instance
 * const executor = new AsyncExecutor();
 *
 * // Add plugins
 * executor.use(new LoggerPlugin());
 * executor.use(new RetryPlugin({ maxAttempts: 3 }));
 *
 * // Execute a task
 * const result = await executor.exec(async (data) => {
 *   return await someAsyncOperation(data);
 * });
 * ```
 */
export abstract class Executor {
  /**
   * Array of active plugins
   *
   * - Purpose: Stores and manages executor plugins
   * - Core Concept: Ordered plugin pipeline
   * - Main Features:
   *  - Maintains plugin execution order
   *  - Supports plugin lifecycle management
   * - Primary Use: Plugin orchestration and execution
   *
   * @example
   * ```typescript
   * protected plugins = [
   *   new LoggerPlugin(),
   *   new RetryPlugin()
   * ];
   * ```
   */
  protected plugins: ExecutorPlugin[] = [];

  /**
   * Creates a new Executor instance
   *
   * - Purpose: Initialize executor with optional configuration
   * - Core Concept: Configurable executor setup
   * - Main Features: Configuration injection
   * - Primary Use: Executor instantiation
   *
   * @param {ExecutorConfig} config - Optional configuration object
   *
   * @example
   * ```typescript
   * const executor = new Executor({
   *   // config options
   * });
   * ```
   */
  constructor(protected config: ExecutorConfig = {}) {}

  /**
   * Add a plugin to the executor
   *
   * - Purpose: Extends executor functionality through plugins
   * - Core Concept: Plugin registration and deduplication
   * - Main Features:
   *  - Prevents duplicate plugins if onlyOne is true
   *  - Maintains plugin execution order
   * - Primary Use: Adding new capabilities to executor
   *
   * @param plugin - Plugin instance to add
   *
   * @example
   * ```typescript
   * executor.use(new LoggerPlugin());
   * executor.use(new RetryPlugin({ maxAttempts: 3 }));
   * ```
   *
   * @example
   *
   * Use a plain object as a plugin
   * ```typescript
   * executor.use({
   *   onBefore: (data) => ({ ...data, modified: true })
   * });
   * ```
   */
  use(plugin: ExecutorPlugin): void {
    if (
      this.plugins.find(
        (p) =>
          p === plugin ||
          p.pluginName === plugin.pluginName ||
          p.constructor === plugin.constructor
      ) &&
      plugin.onlyOne
    ) {
      console.warn(`Plugin ${plugin.pluginName} is already used, skip adding`);
      return;
    }

    this.plugins.push(plugin);
  }

  /**
   * Execute a plugin hook
   *
   * - Purpose: Provides plugin hook execution mechanism
   * - Core Concept: Plugin lifecycle management
   * - Main Features:
   *  - Dynamic hook execution
   *  - Support for async and sync hooks
   * - Primary Use: Running plugin lifecycle methods
   *
   * @param plugins - Plugins to execute
   * @param name - Hook name to execute
   * @param args - Arguments for the hook
   *
   * @example
   * ```typescript
   * await executor.runHook(plugins, 'beforeExec', data);
   * ```
   */
  abstract runHooks(
    plugins: ExecutorPlugin[],
    name: keyof ExecutorPlugin,
    ...args: unknown[]
  ): void | unknown | Promise<void | unknown>;

  /**
   * Execute a task with plugin pipeline
   *
   * - Purpose: Core task execution with plugin support
   * - Core Concept: Task execution pipeline
   * - Main Features:
   *  - Plugin hook integration
   *  - Error handling
   * - Primary Use: Running tasks through the executor pipeline
   *
   * @param task - Task to execute
   * @param data - Optional input data for task
   * @throws {ExecutorError} If task execution fails
   *
   * @example
   * ```typescript
   * const result = await executor.exec(async (data) => {
   *   return await processData(data);
   * });
   * ```
   */
  abstract exec<Result, Params = unknown>(
    task: Task<Result, Params>
  ): Promise<Result> | Result;

  /**
   * Execute a task with plugin pipeline and input data
   *
   * - Purpose: Core task execution with plugin support and input data
   * - Core Concept: Task execution pipeline with data
   * - Main Features:
   *  - Plugin hook integration
   *  - Error handling
   * - Primary Use: Running tasks with input data through the executor pipeline
   *
   * @param data - Input data for task
   * @param task - Task to execute
   * @throws {ExecutorError} If task execution fails
   *
   * @example
   * ```typescript
   * const result = await executor.exec(data, async (data) => {
   *   return await processData(data);
   * });
   * ```
   */
  abstract exec<Result, Params = unknown>(
    data: unknown,
    task: Task<Result, Params>
  ): Promise<Result> | Result;

  /**
   * Execute a task without throwing errors
   *
   * - Purpose: Safe task execution with error wrapping
   * - Core Concept: Error-safe execution pipeline
   * - Main Features:
   *  - Error wrapping in ExecutorError
   *  - Non-throwing execution
   * - Primary Use: When error handling is preferred over exceptions
   *
   * @param task - Task to execute
   *
   * @example
   * ```typescript
   * const result = await executor.execNoError(async (data) => {
   *   return await riskyOperation(data);
   * });
   * if (result instanceof ExecutorError) {
   *   console.error('Task failed:', result);
   * }
   * ```
   */
  abstract execNoError<Result, Params = unknown>(
    task: Task<Result, Params>
  ): Promise<Result | ExecutorError> | Result | ExecutorError;

  /**
   * Execute a task with input data without throwing errors
   *
   * - Purpose: Safe task execution with error wrapping and input data
   * - Core Concept: Error-safe execution pipeline with data
   * - Main Features:
   *  - Error wrapping in ExecutorError
   *  - Non-throwing execution
   * - Primary Use: When error handling is preferred over exceptions with input data
   *
   * @param data - Input data for task
   * @param task - Task to execute
   *
   * @example
   * ```typescript
   * const result = await executor.execNoError(data, async (data) => {
   *   return await riskyOperation(data);
   * });
   * if (result instanceof ExecutorError) {
   *   console.error('Task failed:', result);
   * }
   * ```
   */
  abstract execNoError<Result, Params = unknown>(
    data: unknown,
    task: Task<Result, Params>
  ): Promise<Result | ExecutorError> | Result | ExecutorError;
}
