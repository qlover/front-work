import loadsh from 'lodash';
import { readFileSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Shell } from './Shell.js';
import { cosmiconfigSync } from 'cosmiconfig';

const { isString, isPlainObject, get, set } = loadsh;
const pkg = JSON.parse(readFileSync(resolve('./package.json'), 'utf-8'));

class ReleaseUtil {
  static isValidString(value) {
    return value && isString(value);
  }

  static getPRNumber(output) {
    const prUrlPattern = /https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/(\d+)/;
    const match = output.match(prUrlPattern);
    return (match && match[1]) || '';
  }

  static getUserInfo(pkg, feConfig) {
    const { repository, author } = pkg;
    const localAuthor = feConfig.author || author;

    const authorName = isPlainObject(localAuthor)
      ? get(localAuthor, 'name')
      : localAuthor;

    if (!ReleaseUtil.isValidString(authorName)) {
      throw new Error('please set .fe-config.release valid author');
    }

    const repoName = feConfig.repository || repository.url.split('/').pop();
    if (!ReleaseUtil.isValidString(repoName)) {
      throw new Error('please set .fe-config.release repository');
    }

    return { repoName, authorName };
  }

  static async getDryRrunPRUrl(shell, number) {
    const repoInfo = await shell.run('git remote get-url origin', {
      dryRun: false
    });

    if (!repoInfo) {
      return 'https://github.com/[username]/[repo]/pull/' + number;
    }

    return (
      repoInfo
        .replace(/\.git$/, '')
        .replace('git@github.com:', 'https://github.com/') +
      '/pull/' +
      number
    );
  }

  static getReleaseItSearchPlaces() {
    // https://github.com/release-it/release-it/blob/main/lib/config.js#L11
    return [
      'package.json',
      '.release-it.json',
      '.release-it.js',
      '.release-it.ts',
      '.release-it.cjs',
      '.release-it.yaml',
      '.release-it.yml'
      // FIXME:
      // '.release-it.toml'
    ];
  }
}

export class ReleaseItOutputParser {
  static async getChangelogAndFeatures(releaseItOutput) {
    const chunk = releaseItOutput.split('### Features');
    const changelog = get(chunk, 0, 'No changelog').trim();
    const features = get(chunk, 1, 'No features').trim();
    return {
      changelog,
      features
    };
  }

  static parse(output) {
    const result = {
      name: '',
      changelog: '',
      latestVersion: '',
      version: ''
    };

    // 匹配版本信息和包名
    const versionMatch = output.match(
      /Let's release (.+?) \(([\d.]+)\.\.\.([\d.]+)\)/
    );
    if (versionMatch) {
      result.name = versionMatch[1].trim();
      result.latestVersion = versionMatch[2];
      result.version = versionMatch[3];
    }

    // match changelog
    const lines = output.split('\n');
    const changelogStartIndex = lines.findIndex(
      (line) => line.trim() === 'Changelog:'
    );
    if (changelogStartIndex !== -1) {
      const changelogLines = [];
      let i = changelogStartIndex + 1;

      // collect until "! npm version" or file end
      while (i < lines.length && !lines[i].startsWith('! npm version')) {
        if (lines[i].trim()) {
          // only add non-empty lines
          changelogLines.push(lines[i]);
        }
        i++;
      }

      result.changelog = changelogLines.join('\n').trim();
    }

    return result;
  }
}

class ReleaseBase {
  /**
   * @param {object} config
   * @param {boolean} config.isCreateRelease
   * @param {import('../index.js').FeConfig} config.feConfig
   * @param {import('@qlover/fe-utils').Logger} config.log
   * @param {Shell} config.shell
   */
  constructor(config = {}) {
    this.feConfig = config.feConfig || {};
    this.log = config.log;
    this.shell = config.shell;

    // other config
    this.isCreateRelease = !!config.isCreateRelease;
    this.ghToken = '';
    this.npmToken = '';
    this.branch = '';
    this.userInfo = ReleaseUtil.getUserInfo(pkg, this.feConfig);
    this.pkgVersion = pkg.version;
  }

  /**
   * @param {keyof import('../index.d.ts').FeScriptRelease} path
   * @param {*} defaultValue
   * @returns
   */
  getReleaseFeConfig(path, defaultValue) {
    return get(this.feConfig.release, path, defaultValue);
  }

  async getOctokit() {
    if (this.octokit) {
      return this.octokit;
    }

    const { Octokit } = await import('@octokit/rest');

    const octokit = new Octokit({ auth: this.ghToken });

    this.octokit = octokit;

    return octokit;
  }

  getReleaseBranch(tagName) {
    return Shell.format(this.getReleaseFeConfig('branchName', ''), {
      env: this.env,
      branch: this.branch,
      tagName
    });
  }

  getReleasePRTitle(tagName) {
    return Shell.format(this.getReleaseFeConfig('PRTitle', ''), {
      env: this.env,
      branch: this.branch,
      tagName
    });
  }

  getReleasePRBody({ tagName, changelog }) {
    return Shell.format(this.getReleaseFeConfig('PRBody', ''), {
      branch: this.branch,
      env: this.env,
      tagName,
      changelog
    });
  }

  /**
   * @see https://github.com/release-it/release-it/blob/main/lib/config.js#L29
   * @returns
   * TODO:
   *  If the release it of the project is configured, merge it with the local default one
   *  Directly return a config configuration file path
   */
  getReleaseItConfig() {
    const searchPlaces = ReleaseUtil.getReleaseItSearchPlaces();
    const explorer = cosmiconfigSync('release-it', { searchPlaces });
    const result = explorer.search(resolve());

    // find!
    if (result) {
      return;
    }

    // this json copy with release-it default json
    return join(dirname(fileURLToPath(import.meta.url)), '../.release-it.json');
  }
}

export class Release {
  /**
   * @param {import('../index.d.ts').ReleaseConfig} config
   */
  constructor(config) {
    this.config = new ReleaseBase(config);
    this._releaseItOutput = {
      name: '',
      changelog: '',
      latestVersion: '',
      version: ''
    };
  }

  get dryRun() {
    return this.shell.config.isDryRun || this.log.isDryRun;
  }

  /**
   * @returns {import('@qlover/fe-utils').Logger}
   */
  get log() {
    return this.config.log;
  }

  /**
   * @returns {Shell}
   */
  get shell() {
    return this.config.shell;
  }

  get releaseItEnv() {
    return {
      ...process.env,
      NPM_TOKEN: this.config.npmToken,
      GITHUB_TOKEN: this.config.ghToken
    };
  }

  getPRNumber(output) {
    return ReleaseUtil.getPRNumber(output);
  }

  getReleaseItOptions() {
    const options = {
      ci: true
    };

    if (this.config.isCreateRelease) {
      set(options, 'git.tag', false);
      set(options, 'git.push', false);
      set(options, 'github.release', false);
      set(options, 'npm.publish', false);
      set(options, 'github.release', false);
    } else {
      set(options, 'increment', false);
    }

    if (this.shell.config.isDryRun) {
      set(options, 'dry-run', true);
    }

    return options;
  }

  getReleaseItCommand() {
    const releaseItConfig = this.config.getReleaseItConfig();
    const command = ['npx release-it'];

    command.push('--ci');

    // 添加 --no-npm.install 参数禁用自动安装
    command.push('--no-npm.install');

    // 1. no publish npm
    // 2. no publish github/release/tag
    if (this.config.isCreateRelease) {
      command.push(
        '--no-git.tag --no-git.push --no-npm.publish --no-github.release'
      );
    }
    // use current pkg, no publish npm and publish github
    else {
      command.push('--no-increment');
    }

    if (this.shell.config.isDryRun) {
      command.push('--dry-run');
    }

    this.log.debug(
      'getReleaseItCommand releaseItConfig is, but not use',
      releaseItConfig
    );
    // because packages multiple, so not use release-it config
    // if (releaseItConfig) {
    //   command.push(`--config ${releaseItConfig}`);
    // }

    return command.join(' ');
  }

  async releaseIt(mode = 0) {
    this._releaseItOutput = {
      name: '',
      changelog: '',
      latestVersion: '',
      version: ''
    };

    await this.shell.exec(
      `echo "//registry.npmjs.org/:_authToken=${this.config.npmToken}" > .npmrc`
    );

    let output;
    if (!mode) {
      // only exec release-it command in dryRun
      const command = this.getReleaseItCommand();
      this.log.debug('Run Release-it command: ', command);

      // command has dryrun options
      output = await this.shell.exec(command, {
        env: this.releaseItEnv,
        dryRun: false
      });
      this._releaseItOutput = ReleaseItOutputParser.parse(output);
    } else {
      const options = this.getReleaseItOptions();
      this.log.debug('Run release-it method', options);
      const { default: releaseIt } = await import('release-it');
      output = await releaseIt(options);
      this._releaseItOutput = output;
    }

    this.log.debug('Release-it output:\n', output);

    return output;
  }

  async getChangelogAndFeatures(releaseResult) {
    if (!releaseResult) {
      this.log.warn(
        'No release-it output found, changelog might be incomplete'
      );
    }

    return get(releaseResult, 'changelog', 'No changelog');
  }

  async checkTag() {
    const lastTag = await this.shell.run(
      'git tag --sort=-creatordate | head -n 1'
    );
    const tagName =
      lastTag || get(this._releaseItOutput, 'version', this.config.pkgVersion);

    this.log.debug('Created Tag is:', tagName);

    return { tagName };
  }

  async createReleaseBranch() {
    const { tagName } = await this.checkTag();

    // create a release branch, use new tagName as release branch name
    const releaseBranch = this.config.getReleaseBranch(tagName);

    // this.log.log('Create Release PR branch', releaseBranch);

    await this.shell.exec(`git merge origin/${this.config.branch}`);
    await this.shell.exec(`git checkout -b ${releaseBranch}`);

    try {
      await this.shell.exec(`git push origin ${releaseBranch}`);
      // this.log.info(`PR Branch ${releaseBranch} push Successfully!`);
    } catch (error) {
      this.log.error(error);
    }

    return { tagName, releaseBranch };
  }

  async createPRLabel() {
    try {
      const label = this.config.feConfig.release.label;
      await this.shell.exec(
        'gh label create "${name}" --description "${description}" --color "${color}"',
        {
          context: label
        }
      );
    } catch (error) {
      this.log.error('Create PR label Failed', error);
    }
  }

  /**
   * create Release PR
   * @param {string} tagName
   * @param {string} releaseBranch
   * @returns {Promise<string>}
   */
  async createReleasePR(tagName, releaseBranch, releaseResult) {
    // this.log.log('Create Release PR', tagName, releaseBranch);

    await this.shell.exec(
      `echo "${this.config.ghToken}" | gh auth login --with-token`
    );

    await this.createPRLabel();

    // get changelog and features
    const { changelog } = await this.getChangelogAndFeatures(
      releaseResult || this._releaseItOutput
    );

    const title = this.config.getReleasePRTitle(tagName);
    const body = this.config.getReleasePRBody({ tagName, changelog });

    const command = Shell.format(
      'gh pr create --title "${title}" --body "${body}" --base ${base} --head ${head} --label "${labelName}"',
      {
        title,
        body,
        base: this.config.branch,
        head: releaseBranch,
        labelName: this.config.feConfig.release.label.name
      }
    );

    let output = '';
    try {
      output = await this.shell.run(command, {
        dryRunResult: await ReleaseUtil.getDryRrunPRUrl(this.shell, 999999)
      });
    } catch (error) {
      if (error.toString().includes('already exists:')) {
        this.log.warn('already PR');
        output = error.toString();
      } else {
        throw error;
      }
    }

    if (this.shell.config.isDryRun) {
      this.log.debug(output);
    }

    const prNumber = this.getPRNumber(output);

    if (!prNumber) {
      this.log.error('CreateReleasePR Failed, prNumber is empty');
      // process.exit(1);
      return;
    }
    // this.log.log(output);
    // this.log.info('Created PR Successfully');

    return prNumber;
  }

  async autoMergePR(prNumber) {
    if (!prNumber) {
      this.log.error('Failed to create Pull Request.', prNumber);
      return;
    }

    const userInfo = this.config.userInfo;
    if (!userInfo.repoName || !userInfo.authorName) {
      this.log.error('Not round repo or owner!!!');
      process.exit(1);
    }

    // this.log.log(`Merging PR #${prNumber} ...`);
    const mergeMethod = this.config.getReleaseFeConfig(
      'autoMergeType',
      'squash'
    );
    if (!this.dryRun) {
      const octokit = await this.config.getOctokit();
      await octokit.pulls.merge({
        owner: userInfo.authorName,
        repo: userInfo.repoName,
        pull_number: prNumber,
        merge_method: mergeMethod
      });
    } else {
      const command = Shell.format(
        'gh pr merge --${mergeMethod} --repo ${owner}/${repo} --pull-number ${prNumber}',
        {
          owner: userInfo.authorName,
          repo: userInfo.repoName,
          mergeMethod,
          prNumber
        }
      );
      this.log.exec(command);
    }

    // this.log.info('Merged successfully');
  }

  async checkedPR(prNumber, releaseBranch) {
    await this.shell.exec(`gh pr view ${prNumber}`);
    // this.shell.exec(`git checkout ${this.mainBranch}`);
    // this.shell.exec(`git branch -d ${releaseBranch}`);
    await this.shell.exec(`git push origin --delete ${releaseBranch}`);

    // this.log.info(`Branch ${releaseBranch} has been deleted`);
  }
}
