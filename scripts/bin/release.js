const { execSync } = require('child_process');
const { loadEnv } = require('../loadEnv');
const pkg = require('../../package.json');

function runCommand(command, options = {}) {
  try {
    execSync(command, { stdio: 'inherit', ...options });
  } catch (error) {
    console.error(`Error executing command: ${command}`, error);
    process.exit(1);
  }
}

// Function to clear environment variable
function clearEnvVariable(variable) {
  if (process.env[variable]) {
    delete process.env[variable];
  }
}

function main() {
  loadEnv();

  if (!process.env.NPM_TOKEN) {
    console.error('NPM_TOKEN environment variable is not set.');
    process.exit(1);
  }
  if (!process.env.GITHUB_TOKEN) {
    console.error('GITHUB_TOKEN environment variable is not set.');
    process.exit(1);
  }

  const ghToken = process.env.GITHUB_TOKEN;
  clearEnvVariable('GITHUB_TOKEN');
  runCommand(
    `echo "//registry.npmjs.org/:_authToken=${process.env.NPM_TOKEN}" > .npmrc`
  );

  console.log('Publishing to NPM and GitHub...');
  runCommand('npx release-it --ci', {
    env: {
      ...process.env,
      NPM_TOKEN: process.env.NPM_TOKEN,
      GITHUB_TOKEN: ghToken
    }
  });

  // create PR
  const mainBranch = process.env.PR_BRANCH || 'master';
  const releaseBranch = `release-v${pkg.version}`;
  // runCommand(`git checkout ${mainBranch}`);
  // runCommand(`git branch -d ${releaseBranch}`);
  runCommand(`git merge origin/main`);
  runCommand(`git checkout -b ${releaseBranch}`);
  runCommand(`git push origin ${releaseBranch}`);

  // runCommand(`gh auth login --with-token <<< "${process.env.GITHUB_TOKEN}"`);
  runCommand(`echo "${ghToken}" | gh auth login --with-token`);
  // auto merage
  runCommand(
    `gh pr create --title "[From bot] Release ${mainBranch} v${pkg.version}" --body "This PR includes version bump to v${pkg.version}" --base ${mainBranch} --head ${releaseBranch} --auto-merge`
  );
}

main();
