import { existsSync } from 'node:fs';
import releaseIt from 'release-it';
import { ReleaseConfiger } from './release/ReleaseConfiguter';
import { ReleasePRManager } from './release/ReleasePRManager';
import { Shell } from './Shell';
import { Logger } from '@qlover/fe-core';
import { FeScriptContext } from './FeScriptContext';
import lodash from 'lodash';

const { merge, get } = lodash;

export interface ReleaseOptions {
  path?: string;
  mode?: string;
  releaseBranch?: string;
  releaseEnv?: string;
}
export type ReleaseContext = FeScriptContext<ReleaseOptions>;

/**
 * Manages the release process including publishing and creating pull requests.
 *
 * @class Release
 * @example
 * const release = new Release(context);
 */
export class Release {
  public configer: ReleaseConfiger;
  public prManager: ReleasePRManager;
  private _releaseItOutput?: Record<string, unknown>;
  private npmToken?: string;

  /**
   * Creates an instance of Release.
   *
   * @param context - The release context containing configuration and options.
   */
  constructor(context: ReleaseContext) {
    this.configer = new ReleaseConfiger(context);
    this.prManager = new ReleasePRManager(this.configer);
  }

  /**
   * Gets the logger instance from the configuration.
   *
   * @returns The logger instance.
   */
  get logger(): Logger {
    return this.configer.logger;
  }

  /**
   * Gets the shell instance from the configuration.
   *
   * @returns The shell instance.
   */
  get shell(): Shell {
    return this.configer.shell;
  }

  /**
   * Publishes the release.
   *
   * @param releaseItOptions - Options for the release-it process.
   * @returns The output from the release-it process.
   */
  async publish(
    releaseItOptions: Record<string, unknown> = {}
  ): Promise<Record<string, unknown>> {
    const publishOptions = this.configer.getPublishReleaseItOptions();
    return this.releaseIt(merge(publishOptions, releaseItOptions));
  }

  /**
   * Creates a release pull request.
   *
   * @param tagName - The tag name for the release.
   * @param releaseBranch - The branch for the release.
   * @param releaseResult - The result of the release process.
   * @returns The created pull request number.
   */
  async createReleasePR(
    tagName: string,
    releaseBranch: string,
    releaseResult: Record<string, unknown>
  ): Promise<string> {
    const changelog = this.getChangelogAndFeatures(releaseResult);
    const label = await this.prManager.createReleasePRLabel();

    return this.prManager.createReleasePR({
      tagName,
      releaseBranch,
      changelog,
      label
    });
  }

  /**
   * Automatically merges a pull request.
   *
   * @param prNumber - The pull request number to merge.
   * @param releaseBranch - The branch to merge into.
   */
  async autoMergePR(prNumber: string, releaseBranch: string): Promise<void> {
    return this.prManager.autoMergePR(prNumber, releaseBranch);
  }

  /**
   * Checks the status of a pull request.
   *
   * @param prNumber - The pull request number to check.
   * @param releaseBranch - The branch to check against.
   */
  async checkedPR(prNumber: string, releaseBranch: string): Promise<void> {
    return this.prManager.checkedPR(prNumber, releaseBranch);
  }

  /**
   * Gets the auto merge configuration for release pull requests.
   *
   * @returns The auto merge configuration.
   */
  get autoMergeReleasePR(): boolean {
    return !!this.configer.getReleaseFeConfig(
      'autoMergeReleasePR',
      false
    ) as boolean;
  }

  /**
   * Gets the changelog and features from the release result.
   *
   * @param releaseResult - The result of the release process.
   * @returns The changelog or a warning message.
   */
  getChangelogAndFeatures(releaseResult: Record<string, unknown>): string {
    if (!releaseResult) {
      this.logger.warn(
        'No release-it output found, changelog might be incomplete'
      );
    }

    return get(releaseResult, 'changelog', 'No changelog') as string;
  }

  /**
   * Executes the release-it process.
   *
   * @param releaseItOptions - Options for the release-it process.
   * @returns The output from the release-it process.
   */
  async releaseIt(
    releaseItOptions: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    this.logger.debug('Run release-it method', releaseItOptions);
    const output = await releaseIt(releaseItOptions);
    this._releaseItOutput = output;
    return output;
  }

  /**
   * Creates a changelog and version without publishing.
   *
   * @returns The output from the release-it process.
   */
  async createChangelogAndVersion(): Promise<Record<string, unknown>> {
    return this.releaseIt(this.configer.getReleaseItChangelogOptions());
  }

  /**
   * Creates a release branch.
   *
   * @returns The tag name and release branch.
   */
  async createReleaseBranch(): Promise<{
    tagName: string;
    releaseBranch: string;
  }> {
    const { tagName } = await this.checkTag();
    const releaseBranch = this.configer.getReleaseBranch(tagName);

    this.logger.debug('Create Release PR branch', releaseBranch);

    await this.shell.exec(
      `git fetch origin ${this.configer.releaseBaseBranch}`
    );
    await this.shell.exec(
      `git merge origin/${this.configer.releaseBaseBranch}`
    );
    await this.shell.exec(`git checkout -b ${releaseBranch}`);
    await this.shell.exec(`git push origin ${releaseBranch}`);

    return { tagName, releaseBranch };
  }

  /**
   * Checks the current tag.
   *
   * @returns The tag name.
   */
  async checkTag(): Promise<{ tagName: string }> {
    const tagName =
      get(this._releaseItOutput, 'version') || this.configer.getPkg('version');
    this.logger.debug('Created Tag is:', tagName);

    return { tagName } as { tagName: string };
  }

  /**
   * Checks the NPM authentication.
   *
   * @throws If the NPM token is not set.
   */
  async checkNpmAuth(): Promise<void> {
    if (!this.npmToken) {
      throw new Error('NPM_TOKEN is not set.');
    }

    await this.shell.exec(
      `echo "//registry.npmjs.org/:_authToken=${this.npmToken}" > .npmrc`
    );
  }

  /**
   * Checks the publish path.
   */
  async checkPublishPath(): Promise<void> {
    const publishPath = this.configer.getPublishPath();
    if (publishPath && existsSync(publishPath)) {
      process.chdir(publishPath);
    }

    this.logger.debug('Current path:', process.cwd());
  }

  /**
   * Sets the NPM token.
   *
   * @param npmToken - The NPM token to set.
   */
  setNPMToken(npmToken: string): void {
    this.npmToken = npmToken;
  }
}
