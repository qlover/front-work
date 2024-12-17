import { FeScriptContext } from '../lib/FeScriptContext';
import { Release, ReleaseOptions } from '../lib/Release';
import { Env } from '@qlover/fe-env-loader';

function createRelease(
  scriptsOptions: Partial<FeScriptContext<ReleaseOptions>>
): { release: Release; env: Env } | undefined {
  const context = new FeScriptContext(scriptsOptions);
  const env = Env.searchEnv({
    logger: context.logger,
    preloadList: context.feConfig.envOrder
  });

  if (env.get('FE_RELEASE') === 'false') {
    context.logger.warn('Skip Release');
    return;
  }

  const token = env.get('GITHUB_TOKEN') || env.get('PAT_TOKEN');
  if (!token) {
    context.logger.error(
      'GITHUB_TOKEN or PAT_TOKEN environment variable is not set.'
    );
    return;
  }

  const release = new Release(context);

  release.prManager.setGithubToken(token);

  // adjust env args
  const releaseBranch = env.get('FE_RELEASE_BRANCH') || 'master';
  const releaseEnv = env.get('FE_RELEASE_ENV') || env.get('NODE_ENV');

  // @ts-expect-error
  release.configer.setOptionsFromEnv({ releaseBranch, releaseEnv });

  return { release, env };
}

export async function release(
  options: Partial<FeScriptContext<ReleaseOptions>>
): Promise<void> {
  const results = createRelease(options);
  if (!results) {
    return;
  }

  const { release, env } = results;

  release.logger.debug(release.configer.context);

  // npm_token is required
  if (!env.get('NPM_TOKEN')) {
    release.logger.error('NPM_TOKEN environment variable is not set.');
    return;
  }

  release.setNPMToken(env.get('NPM_TOKEN') || '');

  // check npm
  await release.checkNpmAuth();

  await release.checkPublishPath();
  release.logger.obtrusive('Release to NPM and Github ...');
  await release.publish();

  release.logger.obtrusive('Release Successfully');
}

export async function createReleasePR(
  options: Partial<FeScriptContext<ReleaseOptions>>
): Promise<void> {
  const results = createRelease(options);
  if (!results) {
    return;
  }

  const { release } = results;

  release.logger.debug(release.configer.context);

  await release.checkPublishPath();

  const releaseResult = await release.createChangelogAndVersion();

  release.logger.obtrusive('Create Release Branch ...');
  const { tagName, releaseBranch } = await release.createReleaseBranch();

  release.logger.obtrusive('Create Release PR ...');
  const prNumber = await release.createReleasePR(
    tagName,
    releaseBranch,
    releaseResult
  );

  if (release.autoMergeReleasePR) {
    release.logger.obtrusive('Auto Merge Release PR...');
    await release.autoMergePR(prNumber, releaseBranch);

    await release.checkedPR(prNumber, releaseBranch);
  } else {
    release.logger.info(
      `Please manually merge PR(#${prNumber}) and complete the publishing process afterwards`
    );
  }

  release.logger.obtrusive(`Create Release PR(#${prNumber}) Successfully`);
}
