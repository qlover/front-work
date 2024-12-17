import { ReleaseUtil } from './ReleaseUtil';
import { ReleaseConfiger } from './ReleaseConfiguter';
import { Octokit } from '@octokit/rest';
import { Logger } from '@qlover/fe-core';
import { FeReleaseConfig } from '../../feConfig';

/**
 * Manages the creation and handling of release pull requests.
 *
 * @class ReleasePRManager
 * @example
 * const manager = new ReleasePRManager(configer);
 */
export class ReleasePRManager {
  private configer: ReleaseConfiger;
  private octokit: Octokit | null;
  private ghToken: string | null;

  /**
   * Creates an instance of ReleasePRManager.
   *
   * @param configer - The configuration object for managing releases.
   */
  constructor(configer: ReleaseConfiger) {
    this.configer = configer;
    this.octokit = null;
    this.ghToken = null;
  }

  /**
   * Gets the dry run status from the configuration.
   *
   * @returns Indicates if the operation is a dry run.
   */
  get dryRun(): boolean {
    return this.configer.context.dryRun;
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
   * Sets the GitHub token for authentication.
   *
   * @param token - The GitHub token to set.
   */
  setGithubToken(token: string): void {
    this.ghToken = token;
  }

  /**
   * Retrieves the Octokit instance, creating it if necessary.
   *
   * @returns The Octokit instance for GitHub API interactions.
   * @throws If the GitHub token is not set.
   */
  async getOctokit(): Promise<Octokit> {
    if (this.octokit) {
      return this.octokit;
    }

    if (!this.ghToken) {
      throw new Error('Github token is not set');
    }

    const { Octokit } = await import('@octokit/rest');

    const octokit = new Octokit({ auth: this.ghToken });

    this.octokit = octokit;

    return octokit;
  }

  /**
   * Extracts the pull request number from the output.
   *
   * @param output - The output string containing the pull request information.
   * @returns The extracted pull request number.
   */
  getPRNumber(output: string): string {
    return ReleaseUtil.parserPRNumber(output);
  }

  /**
   * Creates a release pull request label.
   *
   * @returns The created label.
   * @throws If the label is not valid or if the creation fails.
   */
  async createReleasePRLabel(): Promise<FeReleaseConfig['label']> {
    const label = this.configer.feConfig.release?.label;
    if (!label || !label.name || !label.description || !label.color) {
      throw new Error('Label is not valid, skipping creation');
    }
    const { repoName, authorName } = this.configer.getUserInfo();

    if (this.dryRun) {
      this.logger.info(`[DRY RUN] Would create PR label with:`, label);
      return label;
    }

    try {
      const octokit = await this.getOctokit();

      const result = await octokit.rest.issues.createLabel({
        owner: authorName,
        repo: repoName,
        name: label.name,
        description: label.description,
        color: label.color.replace('#', '') // remove # prefix
      });

      this.logger.debug('Create PR label Success', result);

      return label;
    } catch (error) {
      if ((error as { status: number }).status === 422) {
        this.logger.warn(`Label ${label.name} already exists, skipping!`);
        return label;
      }
      this.logger.error('Create PR label Failed', error);
      throw error;
    }
  }

  /**
   * Creates a release pull request.
   *
   * @param options - The options for creating the pull request.
   * @returns The created pull request number.
   * @throws If the creation fails or if the pull request already exists.
   */
  async createReleasePR(options: {
    tagName: string;
    releaseBranch: string;
    changelog: string;
    label: FeReleaseConfig['label'];
  }): Promise<string> {
    const prOptions = this.configer.getCreateReleasePROptions(
      options.tagName,
      options.releaseBranch,
      options.changelog
    );

    const { repoName, authorName } = this.configer.getUserInfo();

    if (this.dryRun) {
      this.logger.info(`[DRY RUN] Would create PR with:`, {
        ...prOptions,
        labels: [options.label?.name]
      });
      return this.configer.dryRunPRNumber;
    }

    const octokit = await this.getOctokit();

    try {
      // create PR
      const response = await octokit.rest.pulls.create(prOptions);
      const issue_number = response.data.number;
      if (!issue_number) {
        throw new Error('CreateReleasePR Failed, prNumber is empty');
      }

      this.logger.debug('Create PR Success', response.data);

      // add label
      if (options.label?.name) {
        const result = await octokit.rest.issues.addLabels({
          owner: authorName,
          repo: repoName,
          issue_number,
          labels: [options.label.name]
        });
        this.logger.debug('Add PR label Success', result);
      }

      return issue_number.toString();
    } catch (error) {
      if (
        (error as { status: number }).status === 422 &&
        (error as { message: string }).message.includes('already exists')
      ) {
        this.logger.warn('PR already exists');
        const match = (error as { message: string }).message.match(
          /pull request #(\d+)/
        );
        return match ? match[1] : '';
      }
      this.logger.error('Failed to create PR', error);
      throw error;
    }
  }

  /**
   * Automatically merges a pull request.
   *
   * @param prNumber - The pull request number to merge.
   * @param releaseBranch - The branch to merge into.
   * @throws If the pull request number is invalid or if the merge fails.
   */
  async autoMergePR(prNumber: string, releaseBranch: string): Promise<void> {
    if (!prNumber) {
      this.logger.error('Failed to create Pull Request.', prNumber);
      return;
    }

    const { repoName, authorName } = this.configer.getUserInfo();
    const mergeMethod = this.configer.getReleaseFeConfig(
      'autoMergeType',
      'squash'
    );

    if (this.dryRun) {
      this.logger.info(
        `[DRY RUN] Would merge PR #${prNumber} with method '${mergeMethod}' in repo ${authorName}/${repoName}, branch ${releaseBranch}`
      );
      return;
    }

    const octokit = await this.getOctokit();
    await octokit.pulls.merge({
      owner: authorName,
      repo: repoName,
      pull_number: Number(prNumber),
      merge_method: mergeMethod as 'squash' | 'merge' | 'rebase'
    });
  }

  /**
   * Checks the status of a pull request and deletes the associated branch.
   *
   * @param prNumber - The pull request number to check.
   * @param releaseBranch - The branch to delete.
   * @throws If the pull request or branch is not found or if the check fails.
   */
  async checkedPR(prNumber: string, releaseBranch: string): Promise<void> {
    try {
      const { repoName, authorName } = this.configer.getUserInfo();
      const octokit = await this.getOctokit();

      // Get PR information
      await octokit.rest.pulls.get({
        owner: authorName,
        repo: repoName,
        pull_number: Number(prNumber)
      });

      // Delete remote branch
      await octokit.rest.git.deleteRef({
        owner: authorName,
        repo: repoName,
        ref: `heads/${releaseBranch}`
      });

      this.logger.info(`Branch ${releaseBranch} has been deleted`);
    } catch (error) {
      if ((error as { status: number }).status === 404) {
        this.logger.warn(
          `PR #${prNumber} or branch ${releaseBranch} not found`
        );
        return;
      }
      this.logger.error('Failed to check PR or delete branch', error);
      throw error;
    }
  }
}
