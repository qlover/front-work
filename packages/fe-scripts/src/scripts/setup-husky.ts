import { resolve, join } from 'node:path';
import { writeFileSync, readFileSync } from 'node:fs';
import {
  FeScriptContext,
  FeScriptContextOptions
} from '../lib/FeScriptContext';

export interface SetupHuskyOptions {
  /**
   * Path to commitlint config
   */
  commitlintPath?: string;
  /**
   * Whether to force setup even if husky is already installed
   * @default false
   */
  force?: boolean;
}

export async function setupHusky(
  options: FeScriptContextOptions<SetupHuskyOptions>
): Promise<void> {
  const context = new FeScriptContext(options);
  const { logger, shell } = context;
  const { commitlintPath = '' } = context.options;
  const relativePath = resolve('./');

  // clear husky config
  await shell.exec(`npx rimraf ${join(relativePath, '.husky')}`);

  // use husky
  await shell.exec('npx husky init');

  const commitlintConfig = resolve(commitlintPath, 'commitlint.config.js');

  // create commit-msg hook
  const commitMsgPath = join(relativePath, '.husky/commit-msg');
  const commitMsgContent = `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx --no -- commitlint --config "${commitlintConfig}" --edit "$1"
`;
  writeFileSync(commitMsgPath, commitMsgContent, { mode: 0o755 });

  // create pre-commit hook
  const preCommitPath = join(relativePath, '.husky/pre-commit');
  const preCommitContent = `npx lint-staged`;
  writeFileSync(preCommitPath, preCommitContent, { mode: 0o755 });

  // read existing package.json
  const pkgPath = join(relativePath, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

  // add lint-staged config
  pkg['lint-staged'] = {
    '*.{js,jsx,ts,tsx}': ['eslint --fix']
  };

  // write back package.json
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

  logger.info('husky completed');

  logger.debug('Commitlint config path:', commitlintConfig);
  logger.debug('Husky commit-msg content:', commitMsgContent);
}
