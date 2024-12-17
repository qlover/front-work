import { ConfigSearch } from './ConfigSearch';
import { ScriptsLogger } from './ScriptsLogger';
import { Shell } from './Shell';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { readFileSync } from 'node:fs';
import { resolve } from 'path';
import { FeConfig } from '../feConfig';
import lodash from 'lodash';
import { Logger } from '@qlover/fe-core';

const { merge } = lodash;

/**
 * Get default configuration from fe-config.json
 * @returns Default configuration object
 * @description
 * Significance: Provides base configuration for fe-scripts
 * Core idea: Load default configuration from file system
 * Main function: Read and parse default configuration
 * Main purpose: Initialize base configuration
 *
 * @example
 * ```typescript
 * const defaultConfig = getDefaultConfig();
 * // { "protectedBranches": ["main", "master"] }
 * ```
 */
function getDefaultConfig(): Record<string, unknown> {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  return JSON.parse(
    readFileSync(resolve(__dirname, '../../../fe-config.json'), 'utf8')
  );
}

/**
 * Create a new ConfigSearch instance with fe configuration
 * @param feConfig - Custom fe configuration
 * @returns ConfigSearch instance
 * @description
 * Significance: Creates configuration search utility
 * Core idea: Merge default and custom configurations
 * Main function: Initialize configuration search
 * Main purpose: Provide configuration discovery
 *
 * @example
 * ```typescript
 * const configSearch = getFeConfigSearch({ debug: true });
 * ```
 */
export function getFeConfigSearch(
  feConfig?: Record<string, unknown>
): ConfigSearch {
  return new ConfigSearch({
    name: 'fe-config',
    defaultConfig: merge(getDefaultConfig(), feConfig)
  });
}

/**
 * Options interface for FeScriptContext
 * @interface
 * @description
 * Significance: Defines script execution context options
 * Core idea: Centralize script execution configuration
 * Main function: Type-safe context options
 * Main purpose: Configure script execution environment
 *
 * @example
 * ```typescript
 * const options: FeScriptContextOptions<T> = {
 *   logger: new ScriptsLogger(),
 *   dryRun: true
 * };
 * ```
 */
export interface FeScriptContextOptions<T> {
  /** Custom logger instance */
  logger?: ScriptsLogger;
  /** Shell instance for command execution */
  shell?: Shell;
  /** Custom fe configuration */
  feConfig?: Record<string, unknown>;
  /** Whether to perform dry run */
  dryRun?: boolean;
  /** Enable verbose logging */
  verbose?: boolean;
  /** Additional script-specific options */
  options?: T;
}

/**
 * Script execution context class
 * @class
 * @description
 * Significance: Manages script execution environment
 * Core idea: Provide unified context for script execution
 * Main function: Initialize and maintain script context
 * Main purpose: Standardize script execution environment
 *
 * @example
 * ```typescript
 * const context = new FeScriptContext<MyOptions>({
 *   dryRun: true,
 *   verbose: true
 * });
 * ```
 */
export class FeScriptContext<T = unknown> {
  /** Logger instance */
  public readonly logger: Logger;
  /** Shell instance */
  public readonly shell: Shell;
  /** Fe configuration */
  public readonly feConfig: FeConfig;
  /** Dry run flag */
  public readonly dryRun: boolean;
  /** Verbose logging flag */
  public readonly verbose: boolean;
  /** Script-specific options */
  public options: T;

  /**
   * Creates a FeScriptContext instance
   *
   * @description
   * Significance: Initializes script execution context
   * Core idea: Setup execution environment
   * Main function: Create context with options
   * Main purpose: Prepare script execution environment
   *
   * @example
   * ```typescript
   * const context = new FeScriptContext({
   *   dryRun: true,
   *   options: { branch: 'main' }
   * });
   * ```
   */
  constructor(scriptsOptions?: FeScriptContextOptions<T>) {
    const { logger, shell, feConfig, dryRun, verbose, options } =
      scriptsOptions || {};

    this.logger = logger || new ScriptsLogger({ debug: verbose, dryRun });
    this.shell = shell || new Shell({ log: this.logger, isDryRun: dryRun });
    this.feConfig = getFeConfigSearch(feConfig).config;
    this.dryRun = !!dryRun;
    this.verbose = !!verbose;
    this.options = options || ({} as T);
  }
}
