import {
  Executor,
  ExecutorContext,
  ExecutorError,
  ExecutorPlugin,
  SyncTask
} from '../../../interface';

/**
 * Synchronous executor class that extends the base Executor
 * Provides synchronous task execution with plugin support
 *
 * Key features:
 * 1. Synchronous plugin hook execution
 * 2. No Promise-based operations
 * 3. Immediate error handling
 * 4. Direct execution flow
 *
 * Use this executor when:
 * 1. All operations are synchronous
 * 2. You need immediate results
 * 3. Performance is critical
 * 4. No async operations are involved
 *
 * @extends Executor
 *
 * @example
 * ```typescript
 * // Create a sync executor
 * const executor = new SyncExecutor();
 *
 * // Add plugins for different purposes
 * executor.use(new ValidationPlugin());
 * executor.use(new LoggerPlugin());
 *
 * // Example 1: Basic sync task execution
 * const result = executor.exec((data) => {
 *   return data.toUpperCase();
 * });
 *
 * // Example 2: Execution with input data
 * const data = { value: 'hello' };
 * const result = executor.exec(data, (input) => {
 *   return input.value.toUpperCase();
 * });
 *
 * // Example 3: Error handling with execNoError
 * const result = executor.execNoError(() => {
 *   throw new Error('Validation Error');
 * }); // Returns ExecutorError instead of throwing
 * ```
 * @category SyncExecutor
 */
export class SyncExecutor extends Executor {
  /**
   * Execute plugin hook functions synchronously
   * Manages the plugin execution chain and handles results
   *
   * Plugin execution flow:
   * 1. Check if plugin is enabled for the hook
   * 2. Execute plugin hook if available
   * 3. Handle plugin results and chain breaking conditions
   *
   * Key differences from AsyncExecutor:
   * - All operations are synchronous
   * - Results are immediately available
   * - No await statements needed
   *
   * @param plugins - Array of plugins to execute
   * @param name - Name of the hook function to execute
   * @param args - Arguments to pass to the hook function
   * @returns Result of the hook function execution
   *
   * @example
   * ```typescript
   * // Internal usage example
   * const result = this.runHook(
   *   this.plugins,
   *   'onBefore',
   *   { value: 'test' }
   * );
   * ```
   */
  runHooks<Params>(
    plugins: ExecutorPlugin[],
    name: keyof ExecutorPlugin,
    context: ExecutorContext<Params>
  ): ExecutorContext<Params> {
    for (const plugin of plugins) {
      if (plugin.enabled && !plugin.enabled?.(name, context)) {
        continue;
      }

      if (!plugin[name]) {
        continue;
      }

      // @ts-expect-error
      const pluginResult = plugin[name](context);
      // TODO: record the result of the lifecycle hooks

      if (pluginResult !== undefined) {
        if (name === 'onError') {
          context.error = pluginResult;
          return context;
        }

        context.returnValue = pluginResult;
      }
    }

    return context;
  }

  /**
   * Execute task without throwing errors
   * Wraps all errors in ExecutorError for safe error handling
   *
   * Advantages over try-catch:
   * 1. Standardized error handling
   * 2. No exception propagation
   * 3. Consistent error types
   *
   * @template T - Type of task return value
   * @param dataOrTask - Task data or task function
   * @param task - Task function (optional)
   * @returns Task result or ExecutorError
   *
   * @example
   * ```typescript
   * const result = executor.execNoError((data) => {
   *   if (!data.isValid) {
   *     throw new Error('Invalid data');
   *   }
   *   return data.value;
   * });
   *
   * if (result instanceof ExecutorError) {
   *   console.log('Task failed:', result.message);
   * } else {
   *   console.log('Task succeeded:', result);
   * }
   * ```
   */
  execNoError<Result, Params = unknown>(
    dataOrTask: Params | SyncTask<Result, Params>,
    task?: SyncTask<Result, Params>
  ): Result | ExecutorError {
    try {
      return this.exec(dataOrTask as Params, task);
    } catch (error) {
      if (error instanceof ExecutorError) {
        return error;
      }

      return new ExecutorError('UNKNOWN_SYNC_ERROR', error as Error);
    }
  }

  /**
   * Execute synchronous task with full plugin pipeline
   * Core method for task execution with plugin support
   *
   * Execution flow:
   * 1. Validate and prepare task
   * 2. Check for custom execution plugins
   * 3. Execute task with plugin pipeline
   *
   * Performance considerations:
   * - No async overhead
   * - Direct execution path
   * - Immediate results
   *
   * @template T - Type of task return value
   * @template D - Type of task data
   * @param dataOrTask - Task data or task function
   * @param task - Task function (optional)
   * @throws {Error} When task is not a function
   * @returns Task execution result
   *
   * @example
   * ```typescript
   * // Example with data transformation
   * const data = { numbers: [1, 2, 3] };
   * const task = (input) => {
   *   return input.numbers.map(n => n * 2);
   * };
   *
   * const result = executor.exec(data, task);
   *
   * // Example with validation
   * const result = executor.exec((data) => {
   *   if (typeof data !== 'string') {
   *     throw new Error('Data must be string');
   *   }
   *   return data.trim();
   * });
   * ```
   */
  exec<Result, Params = unknown>(
    dataOrTask: Params | SyncTask<Result, Params>,
    task?: SyncTask<Result, Params>
  ): Result {
    const actualTask = (task || dataOrTask) as SyncTask<Result, Params>;
    const data = (task ? dataOrTask : undefined) as Params;

    if (typeof actualTask !== 'function') {
      throw new Error('Task must be a function!');
    }

    const runner = (): Result => {
      return this.run(data, actualTask);
    };

    const findOnExec = this.plugins.find(
      (plugin) => typeof plugin['onExec'] === 'function'
    );

    // If the plugin has the onExec hook, execute it
    if (findOnExec) {
      return findOnExec.onExec!(runner) as Result;
    }

    return runner();
  }

  /**
   * Core method to run synchronous task with plugin hooks
   * Implements the complete execution pipeline with all plugin hooks
   *
   * Pipeline stages:
   * 1. onBefore hooks - Pre-process input data
   * 2. Task execution - Run the actual task
   * 3. onSuccess hooks - Post-process results
   * 4. onError hooks - Handle any errors
   *
   * Error handling strategy:
   * - Catches all errors
   * - Passes errors through plugin chain
   * - Wraps unhandled errors in ExecutorError
   *
   * @template T - Type of task return value
   * @template D - Type of task data
   * @param data - Data to pass to the task
   * @param actualTask - Actual task function to execute
   * @throws {ExecutorError} When task execution fails
   * @returns Task execution result
   *
   * @example
   * ```typescript
   * // Internal implementation example
   * private run(data, task) {
   *   try {
   *     const preparedData = this.runHook(this.plugins, 'onBefore', data);
   *     const result = task(preparedData);
   *     return this.runHook(this.plugins, 'onSuccess', result);
   *   } catch (error) {
   *     const handledError = this.runHook(
   *       this.plugins,
   *       'onError',
   *       error,
   *       data
   *     );
   *     // Error handling logic
   *   }
   * }
   * ```
   */
  run<Result, Params = unknown>(
    data: unknown,
    actualTask: SyncTask<Result, Params>
  ): Result {
    const context: ExecutorContext<Params> = {
      parameters: data as Params,
      returnValue: undefined,
      error: undefined
    };

    try {
      const beforeResult = this.runHooks(this.plugins, 'onBefore', context);

      context.returnValue = actualTask(beforeResult);

      this.runHooks(this.plugins, 'onSuccess', context);

      return context.returnValue as Result;
    } catch (error) {
      context.error = error as Error;

      this.runHooks(this.plugins, 'onError', context);

      if (context.error instanceof ExecutorError) {
        throw context.error;
      }

      throw new ExecutorError('UNKNOWN_SYNC_ERROR', context.error);
    }
  }
}
