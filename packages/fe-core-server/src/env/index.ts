import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { Logger } from '@qlover/fe-core';

/**
 * Environment configuration options interface
 * @interface
 * @description
 * Significance: Defines initialization parameters for Env class
 * Core idea: Configure environment variable management
 * Main function: Type-safe environment configuration
 * Main purpose: Initialize environment handler
 * Example:
 * ```typescript
 * const options: EnvOptions = {
 *   rootPath: '/path/to/project',
 *   logger: new Logger()
 * };
 * ```
 */
interface EnvOptions {
  /** Root path for environment files */
  rootPath: string;
  /** Logger instance */
  logger: Logger;
}

/**
 * Environment loading options interface
 * @interface
 * @description
 * Significance: Defines options for loading environment variables
 * Core idea: Control environment file loading behavior
 * Main function: Configure environment loading process
 * Main purpose: Customize environment loading
 * Example:
 * ```typescript
 * const loadOptions: LoadOptions = {
 *   preloadList: ['.env', '.env.local'],
 *   rootPath: '/custom/path'
 * };
 * ```
 */
interface LoadOptions {
  /** List of environment files to load */
  preloadList: string[];
  /** Optional root path override */
  rootPath?: string;
}

/**
 * Environment variable management class
 * @class
 * @description
 * Significance: Manages environment variables and .env files
 * Core idea: Centralize environment variable operations
 * Main function: Load and manage environment variables
 * Main purpose: Provide consistent environment variable access
 * Example:
 * ```typescript
 * const env = new Env({
 *   rootPath: process.cwd(),
 *   logger: new Logger()
 * });
 * env.load({ preloadList: ['.env'] });
 * ```
 */
export class Env {
  private rootPath: string;
  private logger: Logger;

  static searchEnv({
    cwd = process.cwd(),
    preloadList = ['.env.local', '.env'],
    logger,
    maxDepth = 5
  }: {
    cwd?: string;
    preloadList?: string[];
    logger?: Logger;
    maxDepth?: number;
  } = {}): Env {
    // limit max search depth to 10
    // don't override maxDepth if it's not set
    maxDepth = Math.min(maxDepth, 10);

    // create Env instance
    const env = new Env({ rootPath: cwd, logger: logger as Logger });

    // recursive search up, until find .env file or reach root directory
    let currentDir = cwd;
    let lastDir = '';
    let found = false;
    let searchCount = 0;

    while (currentDir !== lastDir) {
      // check if current directory exists environment file
      found = preloadList.some((file) => existsSync(resolve(currentDir, file)));

      if (found) {
        env.load({
          preloadList,
          rootPath: currentDir
        });
        break;
      }

      // check if reached max search depth
      searchCount++;
      if (searchCount >= maxDepth) {
        logger?.warn(
          `Search depth exceeded ${maxDepth} levels, stopping search at ${currentDir}`
        );
        break;
      }

      lastDir = currentDir;
      currentDir = dirname(currentDir);

      // check if reached root directory
      if (currentDir === lastDir) {
        logger?.warn('Reached root directory, stopping search');
        break;
      }
    }

    if (!found && logger) {
      logger.warn(
        `No environment files (${preloadList.join(', ')}) found in directory tree from ${cwd} to ${currentDir}`
      );
    }

    return env;
  }

  /**
   * Creates an Env instance
   * @param options - Environment configuration options
   * @description
   * Significance: Initializes environment management
   * Core idea: Setup environment configuration
   * Main function: Create environment handler
   * Main purpose: Prepare for environment operations
   * Example:
   * ```typescript
   * const env = new Env({
   *   rootPath: './project',
   *   logger: new Logger()
   * });
   * ```
   */
  constructor(options: EnvOptions) {
    this.rootPath = options.rootPath;
    this.logger = options.logger;
  }

  /**
   * Load environment variables from files
   * @param options - Load configuration options
   * @returns void
   * @description
   * Significance: Loads environment variables from files
   * Core idea: Sequential environment file loading
   * Main function: Process and load environment files
   * Main purpose: Initialize environment variables
   * Example:
   * ```typescript
   * env.load({
   *   preloadList: ['.env.local', '.env'],
   *   rootPath: './config'
   * });
   * ```
   */
  load(options: LoadOptions = { preloadList: [] }): void {
    const { preloadList, rootPath } = options;

    if (!preloadList.length) {
      this.logger.warn('Env load preloadList is empty!');
      return;
    }

    const resolvedRootPath = rootPath || this.rootPath || resolve('./');

    for (const file of preloadList) {
      const envLocalPath = resolve(resolvedRootPath, file);
      if (existsSync(envLocalPath)) {
        config({ path: envLocalPath });
        this.logger?.debug?.(`Loaded \`${envLocalPath}\` file`);
        return;
      }
    }

    this.logger?.warn?.('No .env file found');
  }

  /**
   * Remove environment variable
   * @param variable - Environment variable name
   * @returns void
   * @description
   * Significance: Removes specific environment variable
   * Core idea: Safe environment variable deletion
   * Main function: Delete environment variable
   * Main purpose: Clean up environment state
   * Example:
   * ```typescript
   * env.remove('API_KEY');
   * ```
   */
  remove(variable: string): void {
    if (process.env[variable]) {
      delete process.env[variable];
    }
  }

  /**
   * Get environment variable value
   * @param variable - Environment variable name
   * @returns Environment variable value or undefined
   * @description
   * Significance: Retrieves environment variable value
   * Core idea: Safe environment variable access
   * Main function: Get environment variable
   * Main purpose: Access environment state
   * Example:
   * ```typescript
   * const apiKey = env.get('API_KEY');
   * ```
   */
  get(variable: string): string | undefined {
    return process.env[variable];
  }

  /**
   * Set environment variable
   * @param variable - Environment variable name
   * @param value - Value to set
   * @returns void
   * @description
   * Significance: Sets environment variable value
   * Core idea: Safe environment variable modification
   * Main function: Update environment variable
   * Main purpose: Modify environment state
   * Example:
   * ```typescript
   * env.set('DEBUG', 'true');
   * ```
   */
  set(variable: string, value: string): void {
    process.env[variable] = value;
  }

  /**
   * Get and remove environment variable
   * @param variable - Environment variable name
   * @returns Environment variable value or undefined
   * @description
   * Significance: Retrieves and removes environment variable
   * Core idea: Atomic get and delete operation
   * Main function: Access and clean up variable
   * Main purpose: One-time environment variable access
   * Example:
   * ```typescript
   * const tempKey = env.getDestroy('TEMP_API_KEY');
   * ```
   */
  getDestroy(variable: string): string | undefined {
    const value = process.env[variable];
    this.remove(variable);
    return value;
  }
}
