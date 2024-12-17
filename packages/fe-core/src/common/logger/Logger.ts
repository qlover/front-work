import first from 'lodash/first';
import last from 'lodash/last';
import isPlainObject from 'lodash/isPlainObject';
import isString from 'lodash/isString';
import isArray from 'lodash/isArray';
import isObject from 'lodash/isObject';

/**
 * Available log levels
 * Used to categorize and control log output
 */
export const LEVELS = {
  LOG: 'LOG', // General logging
  INFO: 'INFO', // Informational messages
  ERROR: 'ERROR', // Error messages
  WARN: 'WARN', // Warning messages
  DEBUG: 'DEBUG' // Debug information
} as const;

export type LogLevel = (typeof LEVELS)[keyof typeof LEVELS];
export type LogArgument = unknown;

/**
 * Options for execution logging
 * @interface ExecOptions
 */
export type ExecOptions = {
  /** When true, commands are only logged but not executed */
  isDryRun?: boolean;
  /** When true, indicates the command is from an external source */
  isExternal?: boolean;
};

/**
 * Logger class providing various logging methods
 *
 * The Logger class supports multiple log levels and can be configured
 * to operate in different environments such as CI, dry run, debug, and silent modes.
 *
 * - Core Idea: Provide a flexible and configurable logging utility.
 * - Main Function: Log messages at different levels with optional environment-specific behavior.
 * - Main Purpose: Facilitate debugging and monitoring by providing structured log output.
 *
 * @class Logger
 * @example
 * ```typescript
 * // Create a logger instance
 * const logger = new Logger({ debug: true });
 *
 * // Log messages at different levels
 * logger.info('This is an info message');
 * logger.error('This is an error message');
 * logger.debug('This is a debug message');
 * ```
 */
export class Logger {
  protected isCI: boolean;
  protected isDryRun: boolean;
  protected isDebug: boolean;
  protected isSilent: boolean;

  /**
   * Creates a new Logger instance
   *
   * This constructor initializes the Logger with configuration options
   * that determine its behavior in different environments.
   *
   * @param options - Logger configuration options
   * @param {boolean} options.isCI  - Whether running in CI environment
   * @param {boolean} options.dryRun  - Whether to perform dry run only
   * @param {boolean} options.debug  - Whether to enable debug output
   * @param {boolean} options.silent  - Whether to suppress all output
   *
   * @example
   * ```typescript
   * const logger = new Logger({ isCI: true, debug: true });
   * ```
   */
  constructor({
    isCI = false,
    dryRun = false,
    debug = false,
    silent = false
  } = {}) {
    this.isCI = isCI;
    this.isDryRun = dryRun;
    this.isDebug = debug;
    this.isSilent = silent;
  }

  /**
   * Core logging method
   * Handles actual console output based on configuration
   *
   * @param level - Log level for the message
   * @param args - Arguments to log
   *
   * @example
   * ```typescript
   * this.print(LEVELS.INFO, 'Information message');
   * ```
   */
  protected print(level: LogLevel, ...args: LogArgument[]): void {
    if (!this.isSilent) {
      console.log(...args);
    }
  }

  /**
   * Adds prefix to log messages
   * Can be overridden to customize log format
   *
   * @param value - The prefix value
   * @param _level - Log level (optional)
   * @returns Formatted prefix string or array
   *
   * @example
   * ```typescript
   * const prefix = this.prefix('INFO');
   * ```
   */
  prefix(value: string, _level?: LogLevel): string | string[] {
    return value + ' ';
  }

  /**
   * Basic log output
   *
   * @param args - Values to log
   *
   * @example
   * ```typescript
   * logger.log('This is a log message');
   * ```
   */
  log(...args: LogArgument[]): void {
    this.print(LEVELS.LOG, ...args);
  }

  /**
   * Informational log output
   *
   * @param args - Values to log
   *
   * @example
   * ```typescript
   * logger.info('This is an info message');
   * ```
   */
  info(...args: LogArgument[]): void {
    this.print(LEVELS.INFO, this.prefix(LEVELS.INFO), ...args);
  }

  /**
   * Warning log output
   *
   * @param args - Values to log
   *
   * @example
   * ```typescript
   * logger.warn('This is a warning message');
   * ```
   */
  warn(...args: LogArgument[]): void {
    this.print(LEVELS.WARN, this.prefix(LEVELS.WARN), ...args);
  }

  /**
   * Error log output
   *
   * @param args - Values to log
   *
   * @example
   * ```typescript
   * logger.error('This is an error message');
   * ```
   */
  error(...args: LogArgument[]): void {
    this.print(LEVELS.ERROR, this.prefix(LEVELS.ERROR), ...args);
  }

  /**
   * Debug log output
   *
   * - Only active when debug mode is enabled
   * - Formats objects as JSON strings
   *
   * @param args - Values to log
   *
   * @example
   * ```typescript
   * logger.debug('This is a debug message');
   * ```
   */
  debug(...args: LogArgument[]): void {
    if (this.isDebug) {
      const firstArg = first(args);
      const firstValue = isObject(firstArg)
        ? JSON.stringify(firstArg)
        : String(firstArg);

      this.print(
        LEVELS.DEBUG,
        this.prefix(LEVELS.DEBUG),
        firstValue,
        ...args.slice(1)
      );
    }
  }

  /**
   * Verbose log output
   *
   * - Only active when debug mode is enabled
   * - Uses purple color for output
   *
   * @param args - Values to log
   *
   * @example
   * ```typescript
   * logger.verbose('This is a verbose message');
   * ```
   */
  verbose(...args: LogArgument[]): void {
    if (this.isDebug) {
      this.print(LEVELS.DEBUG, ...args);
    }
  }

  /**
   * Command execution logging
   * Supports dry run mode and external command indication
   *
   * @param args - Command arguments and options
   *
   * @example
   * ```typescript
   * logger.exec('npm', 'install', { isDryRun: true });
   * logger.exec(['git', 'commit', '-m', 'feat: update'], { isExternal: true });
   * ```
   */
  exec(...args: (LogArgument | ExecOptions)[]): void {
    const lastArg = isPlainObject(last(args)) ? last(args) : undefined;
    const { isDryRun, isExternal } = (lastArg || {}) as ExecOptions;

    if (isDryRun || this.isDryRun) {
      const prefix = isExternal == null ? '$' : '!';
      const command = args
        .slice(0, lastArg == null ? undefined : -1)
        .map((cmd) =>
          isString(cmd) ? cmd : isArray(cmd) ? cmd.join(' ') : String(cmd)
        )
        .join(' ');
      const message = [prefix, command].join(' ').trim();
      this.log(message);
    }
  }

  /**
   * Obtrusive log output
   * Adds extra line breaks in non-CI environments
   *
   * @param args - Values to log
   *
   * @example
   * ```typescript
   * logger.obtrusive('This is an important message');
   * ```
   */
  obtrusive(...args: LogArgument[]): void {
    if (!this.isCI) this.log();
    this.log(...args);
    if (!this.isCI) this.log();
  }
}
