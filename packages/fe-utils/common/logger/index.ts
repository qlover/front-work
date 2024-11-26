import first from 'lodash/first';
import last from 'lodash/last';
import isPlainObject from 'lodash/isPlainObject';
import isString from 'lodash/isString';
import isArray from 'lodash/isArray';
import isObject from 'lodash/isObject';

export const LEVELS = {
  LOG: 'LOG',
  INFO: 'INFO',
  ERROR: 'ERROR',
  WARN: 'WARN',
  DEBUG: 'DEBUG'
} as const;

export type LogLevel = (typeof LEVELS)[keyof typeof LEVELS];
export type LogArgument = unknown;

export type ExecOptions = {
  isDryRun?: boolean;
  isExternal?: boolean;
};

/**
 * Logger class for handling different levels of logging.
 */
export class Logger {
  protected isCI: boolean;
  protected isDryRun: boolean;
  protected isDebug: boolean;
  protected isSilent: boolean;

  /**
   * Creates an instance of Logger.
   * @param {Object} options - Configuration options for the logger.
   * @param {boolean} [options.isCI=false] - Indicates if running in a CI environment.
   * @param {boolean} [options.dryRun=false] - Indicates if dry run mode is enabled.
   * @param {boolean} [options.debug=false] - Indicates if debug mode is enabled.
   * @param {boolean} [options.silent=false] - Indicates if silent mode is enabled.
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
   * Prints log messages to the console.
   * @param {LogLevel} level - The level of the log.
   * @param {...LogArgument} args - The arguments to log.
   */
  protected print(level: LogLevel, ...args: LogArgument[]): void {
    if (!this.isSilent) {
      console.log(...args);
    }
  }

  /**
   * Adds a prefix to the log message.
   * @param {string} value - The prefix value.
   * @param {LogLevel} [_level] - The log level.
   * @returns {string | string[]} The prefixed value.
   */
  prefix(value: string, _level?: LogLevel): string | string[] {
    return value + ' ';
  }

  /**
   * Logs a message at the LOG level.
   * @param {...LogArgument} args - The arguments to log.
   */
  log(...args: LogArgument[]): void {
    this.print(LEVELS.LOG, ...args);
  }

  /**
   * Logs a message at the INFO level.
   * @param {...LogArgument} args - The arguments to log.
   */
  info(...args: LogArgument[]): void {
    this.print(LEVELS.INFO, this.prefix(LEVELS.INFO), ...args);
  }

  /**
   * Logs a message at the WARN level.
   * @param {...LogArgument} args - The arguments to log.
   */
  warn(...args: LogArgument[]): void {
    this.print(LEVELS.WARN, this.prefix(LEVELS.WARN), ...args);
  }

  /**
   * Logs a message at the ERROR level.
   * @param {...LogArgument} args - The arguments to log.
   */
  error(...args: LogArgument[]): void {
    this.print(LEVELS.ERROR, this.prefix(LEVELS.ERROR), ...args);
  }

  /**
   * Logs a message at the DEBUG level if debug mode is enabled.
   * @param {...LogArgument} args - The arguments to log.
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
   * Logs a verbose message if debug mode is enabled.
   * @param {...LogArgument} args - The arguments to log.
   */
  verbose(...args: LogArgument[]): void {
    if (this.isDebug) {
      // use purple color
      this.print(LEVELS.DEBUG, ...args);
    }
  }

  /**
   * Executes a command with optional dry run and external options.
   * @param {...(LogArgument | ExecOptions)} args - The command and options.
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
   * Logs a message that is more noticeable, with extra spacing if not in CI.
   * @param {...LogArgument} args - The arguments to log.
   */
  obtrusive(...args: LogArgument[]): void {
    if (!this.isCI) this.log();
    this.log(...args);
    if (!this.isCI) this.log();
  }
}
