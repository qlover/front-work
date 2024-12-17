import { createRequire } from 'module';
import { exec } from 'child_process';
import { Logger } from '@qlover/fe-core';

const require = createRequire(import.meta.url);

/**
 * Shell interface for command execution
 * @interface
 * @description
 * Significance: Defines shell command execution contract
 * Core idea: Abstract command execution
 * Main function: Execute shell commands
 * Main purpose: Provide command execution interface
 * Example:
 * ```typescript
 * const shell: ShellInterface = {
 *   run: async (cmd) => execPromise(cmd)
 * };
 * ```
 */
interface ShellInterface {
  run: (command: string, silent?: boolean) => Promise<string>;
}

/**
 * Dependency check result interface
 * @interface
 * @description
 * Significance: Represents dependency installation status
 * Core idea: Track dependency locations
 * Main function: Store dependency check results
 * Main purpose: Determine dependency availability
 * Example:
 * ```typescript
 * const result: DependencyCheckResult = {
 *   local: true,
 *   global: false
 * };
 * ```
 */
interface DependencyCheckResult {
  local: boolean;
  global: boolean;
}

/**
 * Dependency version information interface
 * @interface
 * @description
 * Significance: Represents dependency version details
 * Core idea: Track dependency version and scope
 * Main function: Store version information
 * Main purpose: Version management
 * Example:
 * ```typescript
 * const version: DependencyVersion = {
 *   version: '1.0.0',
 *   scope: 'local'
 * };
 * ```
 */
interface DependencyVersion {
  version: string;
  scope: 'local' | 'global';
}

/**
 * Dependency management class
 * @class
 * @description
 * Significance: Manages npm dependencies
 * Core idea: Centralize dependency operations
 * Main function: Install and check dependencies
 * Main purpose: Ensure required dependencies are available
 * Example:
 * ```typescript
 * const dep = new Dependencie({ logger: new Logger() });
 * await dep.checkWithInstall('typescript');
 * ```
 */
export class Dependencie {
  private logger: Logger;
  private shell: ShellInterface;

  /**
   * Creates a Dependencie instance
   * @param options - Dependency manager options
   * @description
   * Significance: Initializes dependency management
   * Core idea: Setup dependency handling environment
   * Main function: Create dependency manager
   * Main purpose: Prepare for dependency operations
   * Example:
   * ```typescript
   * const dep = new Dependencie({
   *   logger: new Logger(),
   *   shell: customShell
   * });
   * ```
   */
  constructor(options: { logger: Logger; shell?: ShellInterface }) {
    this.logger = options.logger;
    this.shell = options.shell || { run: this.execPromise.bind(this) };
  }

  /**
   * Execute shell command
   * @param command - Command to execute
   * @param silent - Whether to suppress output
   * @returns Promise with command output
   * @private
   * @description
   * Significance: Provides command execution
   * Core idea: Promise-based command execution
   * Main function: Execute shell commands
   * Main purpose: Internal command handling
   * Example:
   * ```typescript
   * await this.execPromise('npm list', true);
   * ```
   */
  private execPromise(command: string, silent = false): Promise<string> {
    return new Promise((resolve, reject) => {
      const childProcess = exec(command, (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(stdout.trim());
      });

      if (!silent) {
        childProcess.stdout?.on('data', (data) => {
          this.logger.log(data.toString().trim());
        });

        childProcess.stderr?.on('data', (data) => {
          this.logger.error(data.toString().trim());
        });
      }
    });
  }

  /**
   * Check if dependency is installed
   * @param packageName - Package to check
   * @param global - Whether to check global installation
   * @returns Dependency check result
   * @description
   * Significance: Verifies dependency installation
   * Core idea: Check both local and global installations
   * Main function: Determine package availability
   * Main purpose: Dependency verification
   * Example:
   * ```typescript
   * const status = await dep.checkDependencyInstalled('typescript', true);
   * ```
   */
  async checkDependencyInstalled(
    packageName: string,
    global = false
  ): Promise<DependencyCheckResult> {
    const result: DependencyCheckResult = { local: false, global: false };
    try {
      await this.shell.run(`npm list ${packageName}`);
      result.local = true;
    } catch {
      if (global) {
        try {
          await this.shell.run(`npm list -g ${packageName}`);
          result.global = true;
        } catch {
          // Ignore errors, assume dependency is not installed globally
        }
      }
    }
    return result;
  }

  /**
   * Get global dependency version
   * @param dependencyName - Package name
   * @returns Version information
   * @description
   * Significance: Retrieves global package version
   * Core idea: Check global package version
   * Main function: Get version information
   * Main purpose: Version verification
   * Example:
   * ```typescript
   * const version = await dep.getGlobalDependencyVersion('typescript');
   * ```
   */
  async getGlobalDependencyVersion(
    dependencyName: string
  ): Promise<DependencyVersion> {
    const result: DependencyVersion = { version: '', scope: 'global' };
    try {
      const stdioResult = await this.shell.run(
        `npm ls -g ${dependencyName} --depth=0 --json`
      );
      const jsonResult = JSON.parse(stdioResult);
      if (jsonResult.dependencies?.[dependencyName]) {
        result.version = jsonResult.dependencies[dependencyName].version;
      }
    } catch (error) {
      this.logger.error(error);
    }
    return result;
  }

  /**
   * Get dependency version
   * @param dependencyName - Package name
   * @returns Version information
   * @description
   * Significance: Retrieves package version
   * Core idea: Check local then global version
   * Main function: Get version information
   * Main purpose: Version management
   * Example:
   * ```typescript
   * const version = await dep.getDependencyVersion('typescript');
   * ```
   */
  async getDependencyVersion(
    dependencyName: string
  ): Promise<DependencyVersion> {
    const has = await this.checkDependencyInstalled(dependencyName, false);
    if (has.local) {
      try {
        const localPackageJsonPath = require.resolve(
          `${dependencyName}/package.json`
        );
        const localPackageJson = require(localPackageJsonPath);
        return { version: localPackageJson.version, scope: 'local' };
      } catch (error) {
        this.logger.error(error);
      }
    }
    return await this.getGlobalDependencyVersion(dependencyName);
  }

  /**
   * Check and install dependency if needed
   * @param packageName - Package to check/install
   * @param global - Whether to use global installation
   * @returns Promise<void>
   * @description
   * Significance: Ensures dependency availability
   * Core idea: Verify and install if missing
   * Main function: Dependency management
   * Main purpose: Automatic dependency handling
   * Example:
   * ```typescript
   * await dep.checkWithInstall('typescript', false);
   * ```
   */
  async checkWithInstall(packageName: string, global = false): Promise<void> {
    const hasDeep = await this.checkDependencyInstalled(packageName, global);
    if (!(hasDeep.local || hasDeep.global)) {
      this.logger.error(`${packageName} not found, installing ${packageName}`);
      await this.install(packageName, global);
    }
    const version = await this.getDependencyVersion(packageName);
    this.logger.log(`${packageName} version is: v${version.version}`);
  }

  /**
   * Install package
   * @param packageName - Package to install
   * @param global - Whether to install globally
   * @returns Promise<void>
   * @description
   * Significance: Installs npm package
   * Core idea: Package installation
   * Main function: Install dependency
   * Main purpose: Package management
   * Example:
   * ```typescript
   * await dep.install('typescript', true);
   * ```
   */
  async install(packageName: string, global = false): Promise<void> {
    await this.shell.run(`npm i ${global ? '-g' : ''} ${packageName}`);
  }
}
