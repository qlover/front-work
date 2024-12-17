import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

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
  static searchEnv({
    cwd = process.cwd(),
    preloadList = ['.env.local', '.env'],
    logger,
    maxDepth = 5
  } = {}) {
    // limit max search depth to 10
    // don't override maxDepth if it's not set
    maxDepth = Math.min(maxDepth, 10);

    // create Env instance
    const env = new Env({ rootPath: cwd, logger: logger });

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
   * @param {EnvOptions} options - Environment configuration options
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
  constructor(options) {
    this.rootPath = options.rootPath;
    this.logger = options.logger;
  }

  /**
   * Load environment variables from files
   * @param {LoadOptions} options - Load configuration options
   * @returns {void}
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
  load(options = { preloadList: [] }) {
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
   * @param {string} variable - Environment variable name
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
  remove(variable) {
    if (process.env[variable]) {
      delete process.env[variable];
    }
  }

  /**
   * Get environment variable value
   * @param {string} variable - Environment variable name
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
  get(variable) {
    return process.env[variable];
  }

  /**
   * Set environment variable
   * @param {string} variable - Environment variable name
   * @param {string} value - Value to set
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
  set(variable, value) {
    process.env[variable] = value;
  }

  /**
   * Get and remove environment variable
   * @param {string} variable - Environment variable name
   * @returns {string|undefined} Environment variable value or undefined
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
  getDestroy(variable) {
    const value = process.env[variable];
    this.remove(variable);
    return value;
  }
}
