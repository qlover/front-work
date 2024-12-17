import shell from 'shelljs';
import { execa } from 'execa';
import { Logger } from '@qlover/fe-core';
import lodash from 'lodash';

const { isEmpty, template: lodashTemplate } = lodash;

/**
 * Configuration interface for Shell class
 * @interface
 */
interface ShellConfig {
  /** Whether to run in dry-run mode */
  isDryRun?: boolean;
  /** Logger instance */
  log: Logger;
}

/**
 * Options for shell execution
 * @interface
 */
export interface ShellExecOptions {
  /**
   * Whether to suppress output
   */
  silent?: boolean;

  /**
   * Environment variables to be passed to the command
   */
  env?: Record<string, string>;

  /**
   * Result to return when in dry-run mode
   */
  dryRunResult?: unknown;

  /**
   * Whether to perform a dry run
   * Overrides shell config.isDryRun if set
   */
  dryRun?: boolean;

  /**
   * Whether to use external command execution
   */
  external?: boolean;

  /**
   * Template context for command string interpolation
   */
  context?: Record<string, unknown>;

  /**
   * Additional shelljs options
   */
  async?: boolean;
}

/**
 * Metadata for command execution
 * @interface
 */
interface ExecMeta {
  /** Whether the command is executed externally */
  isExternal: boolean;
  /** Whether the command result is cached */
  isCached?: boolean;
}

/**
 * Error interface for execa execution
 * @interface
 */
interface ExecaError extends Error {
  stdout?: string;
  stderr?: string;
  message: string;
}

/**
 * Shell class for command execution
 * @class
 * @description Provides methods for executing shell commands with caching and templating support
 */
export class Shell {
  /**
   * Creates a new Shell instance
   * @param config - Shell configuration
   * @param cache - Command cache map
   */
  constructor(
    public config: ShellConfig,
    private cache: Map<string, Promise<string>> = new Map()
  ) {}

  /**
   * Gets the logger instance
   */
  get logger(): Logger {
    return this.config.log;
  }

  /**
   * Formats a template string with context
   * @param template - Template string
   * @param context - Context object for template interpolation
   * @returns Formatted string
   */
  static format(
    template: string = '',
    context: Record<string, unknown> = {}
  ): string {
    return lodashTemplate(template)(context);
  }

  /**
   * Formats a template string with context and error handling
   * @param template - Template string
   * @param context - Context object for template interpolation
   * @returns Formatted string
   * @throws Error if template formatting fails
   */
  format(template: string = '', context: Record<string, unknown> = {}): string {
    try {
      return Shell.format(template, context);
    } catch (error) {
      this.logger.error(
        `Unable to render template with context:\n${template}\n${JSON.stringify(context)}`
      );
      this.logger.error(error);
      throw error;
    }
  }

  /**
   * Executes a command with options
   * @param command - Command string or array
   * @param options - Execution options
   * @returns Promise resolving to command output
   */
  exec(
    command: string | string[],
    options: ShellExecOptions = {}
  ): Promise<string> {
    if (isEmpty(command)) {
      return Promise.resolve('');
    }
    const { context, ...execOptions } = options;
    return typeof command === 'string'
      ? this.execFormattedCommand(
          this.format(command, context || {}),
          execOptions
        )
      : this.execFormattedCommand(command, execOptions);
  }

  /**
   * Executes a command silently
   * @param command - Command string or array
   * @param options - Execution options
   * @returns Promise resolving to command output
   */
  run(
    command: string | string[],
    options: ShellExecOptions = {}
  ): Promise<string> {
    return this.exec(command, { silent: true, ...options });
  }

  /**
   * Executes a formatted command with caching
   * @param command - Formatted command string or array
   * @param options - Execution options
   * @returns Promise resolving to command output
   */
  async execFormattedCommand(
    command: string | string[],
    options: ShellExecOptions = {}
  ): Promise<string> {
    const { dryRunResult, silent, external, dryRun } = options;
    const isDryRun = dryRun !== undefined ? dryRun : this.config.isDryRun;
    const isExternal = external === true;
    const cacheKey = typeof command === 'string' ? command : command.join(' ');
    const isCached = !isExternal && this.cache.has(cacheKey);

    if (!silent) {
      this.logger.exec(command, { isExternal, isCached });
    }

    if (isDryRun) {
      return Promise.resolve(dryRunResult as string);
    }

    if (isCached) {
      return this.cache.get(cacheKey)!;
    }

    const result =
      typeof command === 'string'
        ? this.execStringCommand(command, options)
        : this.execWithArguments(command, options, { isExternal });

    if (!isExternal && !this.cache.has(cacheKey)) {
      this.cache.set(cacheKey, result);
    }

    return result;
  }

  /**
   * Executes a string command using shelljs
   * @param command - Command string
   * @param options - Execution options
   * @returns Promise resolving to command output
   */
  execStringCommand(
    command: string,
    options: ShellExecOptions
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      shell.exec(
        command,
        { async: true, ...options },
        (code: number, stdout: string, stderr: string) => {
          stdout = stdout.toString().trimEnd();
          if (code === 0) {
            resolve(stdout);
          } else {
            if (options.silent) {
              this.logger.error(command);
            }
            reject(new Error(stderr || stdout));
          }
        }
      );
    });
  }

  /**
   * Executes a command with arguments using execa
   * @param command - Command array
   * @param options - Execution options
   * @param meta - Execution metadata
   * @returns Promise resolving to command output
   */
  async execWithArguments(
    command: string[],
    _: ShellExecOptions,
    meta: ExecMeta
  ): Promise<string> {
    const [program, ...programArgs] = command;

    try {
      const { stdout: out, stderr } = await execa(program, programArgs);
      const stdout = out === '""' ? '' : out;
      this.logger.verbose(stdout, { isExternal: meta.isExternal });
      return stdout || stderr;
    } catch (error) {
      if (this.isExecaError(error)) {
        if (error.stdout) {
          this.logger.log(`\n${error.stdout}`);
        }
        throw new Error(error.stderr || error.message);
      }
      throw error;
    }
  }

  /**
   * Type guard for ExecaError
   * @param error - Unknown error to check
   * @returns Whether the error is an ExecaError
   */
  private isExecaError(error: unknown): error is ExecaError {
    return error instanceof Error && ('stdout' in error || 'stderr' in error);
  }
}
