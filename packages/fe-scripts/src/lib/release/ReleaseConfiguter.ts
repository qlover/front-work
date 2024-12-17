import { Shell } from '../Shell';
import { ReleaseUtil } from './ReleaseUtil';
import lodash from 'lodash';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { FeConfig, FeReleaseConfig } from '../../feConfig';
import { Logger } from '@qlover/fe-core';
import { ReleaseContext } from '../Release';

const { merge, set, get } = lodash;

/**
 * Configures the release process by managing the release configuration.
 *
 * @class ReleaseConfiger
 * @example
 * const configer = new ReleaseConfiger(context);
 */
export class ReleaseConfiger {
  public context: ReleaseContext;
  public feConfig: FeConfig;

  /**
   * Creates an instance of ReleaseConfiger.
   *
   * @param context - The release context containing configuration and options.
   */
  constructor(context: ReleaseContext) {
    this.context = context;
    this.feConfig = this.initFEConfig(context.feConfig, context);
  }

  /**
   * Gets the dry run pull request number.
   *
   * @returns The dry run pull request number.
   */
  get dryRunPRNumber(): string {
    return '999999';
  }

  /**
   * Gets the logger instance from the context.
   *
   * @returns The logger instance.
   */
  get logger(): Logger {
    return this.context.logger;
  }

  /**
   * Gets the shell instance from the context.
   *
   * @returns The shell instance.
   */
  get shell(): Shell {
    return this.context.shell;
  }

  /**
   * Gets the base branch for the release.
   *
   * @returns The release base branch.
   */
  get releaseBaseBranch(): string | undefined {
    return this.context.options.releaseBranch;
  }

  /**
   * Gets the environment for the release.
   *
   * @returns The release environment.
   */
  get releaseEnv(): string | undefined {
    return this.context.options.releaseEnv;
  }

  /**
   * Initializes the front-end configuration.
   *
   * @param feConfig - The front-end configuration.
   * @param context - The release context.
   * @returns The initialized front-end configuration.
   */
  initFEConfig(feConfig: FeConfig, context: ReleaseContext): FeConfig {
    feConfig = merge({}, context.feConfig);

    if (context.options.path) {
      set(feConfig, 'release.publishPath', context.options.path);
    }

    return feConfig;
  }

  /**
   * Gets user information from the package.
   *
   * @returns The user information including repository name and author name.
   * @throws If the repository name or author name is not found.
   */
  getUserInfo(): { repoName: string; authorName: string } {
    const pkg = this.getPkg() as Record<string, unknown>;
    const userInfo = ReleaseUtil.getUserInfo(pkg, this.feConfig);

    if (!userInfo.repoName || !userInfo.authorName) {
      throw new Error('Not round repo or owner!!!');
    }

    return userInfo;
  }

  /**
   * Gets the package information from package.json.
   *
   * @param key - The specific key to retrieve from the package.
   * @returns The package information or the specific value for the key.
   */
  getPkg(key?: string): unknown {
    const pkg = JSON.parse(readFileSync(resolve('./package.json'), 'utf-8'));
    return key ? get(pkg, key) : pkg;
  }

  /**
   * Gets the release front-end configuration.
   *
   * @param path - The path to the configuration.
   * @param defaultValue - The default value if the path is not found.
   * @returns The value from the release front-end configuration.
   */
  getReleaseFeConfig(
    path: keyof FeReleaseConfig,
    defaultValue: unknown
  ): unknown {
    return get(this.feConfig.release, path, defaultValue);
  }

  /**
   * Gets the publish path for the release.
   *
   * @returns The publish path.
   */
  getPublishPath(): string {
    // @ts-expect-error
    return this.getReleaseFeConfig('publishPath', process.cwd()) as string;
  }

  /**
   * Gets the release branch based on the tag name.
   *
   * @param tagName - The tag name for the release.
   * @returns The formatted release branch.
   */
  getReleaseBranch(tagName: string): string {
    // @ts-expect-error
    return Shell.format(this.getReleaseFeConfig('branchName', ''), {
      env: this.releaseEnv,
      branch: this.releaseBaseBranch,
      tagName
    });
  }

  /**
   * Gets the title for the release pull request.
   *
   * @param tagName - The tag name for the release.
   * @returns The formatted release pull request title.
   */
  getReleasePRTitle(tagName: string): string {
    // @ts-expect-error
    return Shell.format(this.getReleaseFeConfig('PRTitle', ''), {
      env: this.releaseEnv,
      branch: this.releaseBaseBranch,
      tagName,
      pkgName: this.getPkg('name')
    });
  }

  /**
   * Gets the body for the release pull request.
   *
   * @param options - The options containing tag name and changelog.
   * @returns The formatted release pull request body.
   */
  getReleasePRBody({
    tagName,
    changelog
  }: {
    tagName: string;
    changelog: string;
  }): string {
    // @ts-expect-error
    return Shell.format(this.getReleaseFeConfig('PRBody', ''), {
      branch: this.releaseBaseBranch,
      env: this.releaseEnv,
      tagName,
      changelog
    });
  }

  /**
   * Gets the options for the publish release-it process.
   *
   * @returns The options for the publish release-it process.
   */
  getPublishReleaseItOptions(): {
    ci: boolean;
    npm: { publish: boolean };
    git: {
      requireCleanWorkingDir: boolean;
      requireUpstream: boolean;
      changelog: boolean;
    };
    plugins: { '@release-it/conventional-changelog': { infile: boolean } };
    'dry-run': boolean;
    verbose: boolean;
    increment: string;
  } {
    return {
      ci: true,
      npm: {
        publish: true
      },
      git: {
        requireCleanWorkingDir: false,
        requireUpstream: false,
        changelog: false
      },
      plugins: {
        '@release-it/conventional-changelog': {
          infile: false
        }
      },
      'dry-run': this.context.dryRun,
      verbose: true,
      increment: this.getPkg('version') as string
    };
  }

  /**
   * Gets the options for creating a release pull request.
   *
   * @param tagName - The tag name for the release.
   * @param releaseBranch - The branch for the release.
   * @param changelog - The changelog for the release.
   * @returns The options for creating a release pull request.
   */
  getCreateReleasePROptions(
    tagName: string,
    releaseBranch: string,
    changelog: string
  ): {
    owner: string;
    repo: string;
    title: string;
    body: string;
    base: string;
    head: string;
  } {
    const { repoName, authorName } = this.getUserInfo();
    const title = this.getReleasePRTitle(tagName);
    const body = this.getReleasePRBody({ tagName, changelog });

    return {
      owner: authorName,
      repo: repoName,
      title,
      body,
      base: this.releaseBaseBranch as string,
      head: releaseBranch
    };
  }

  /**
   * Gets the options for the release-it changelog process.
   *
   * @returns The options for the release-it changelog process.
   */
  getReleaseItChangelogOptions(): {
    ci: boolean;
    increment: string;
    npm: { publish: boolean };
    git: { requireCleanWorkingDir: boolean; tag: boolean; push: boolean };
    github: { release: boolean };
    verbose: boolean;
    'dry-run': boolean;
  } {
    return {
      ci: true,
      increment: 'patch',
      npm: {
        publish: false
      },
      git: {
        requireCleanWorkingDir: false,
        tag: false,
        push: false
      },
      github: {
        release: false
      },
      verbose: true,
      'dry-run': this.context.dryRun
    };
  }

  /**
   * Sets options from the environment.
   *
   * @param options - The options to set from the environment.
   */
  setOptionsFromEnv(options: Partial<FeConfig>): void {
    this.context.options = merge(this.context.options, options);
  }
}
