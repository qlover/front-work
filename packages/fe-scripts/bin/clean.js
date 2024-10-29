#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, lstatSync } from 'fs';
import { join, relative } from 'path';
import { feConfig, logger } from '../container.js';
import ignore from 'ignore';
import { sync as rimraf } from 'rimraf';

// parse command line arguments
async function programArgs() {
  try {
    const commander = await import('commander');
    const program = new commander.Command();
    program
      .option('-r, --recursion', 'recursion delete')
      .option('--dryrun', 'preview files to be deleted (will not delete)')
      .option(
        '--gitignore',
        'use .gitignore file to determine files to be deleted'
      )
      .parse(process.argv);

    return program.opts();
  } catch {
    // if commander is not available, parse arguments manually
    const args = process.argv.slice(2);
    return {
      recursion: args.includes('-r') || args.includes('--recursion'),
      gitignore: args.includes('--gitignore'),
      dryrun: args.includes('--dryrun')
    };
  }
}

async function main() {
  const options = await programArgs();
  let filesToClean = feConfig.config.cleanFiles || [];
  let ignoreToClean = [];

  // if config.cleanFiles is empty, try to read .gitignore
  if (options.gitignore) {
    try {
      const gitignorePath = join(process.cwd(), '.gitignore');
      if (existsSync(gitignorePath)) {
        const gitignoreContent = readFileSync(gitignorePath, 'utf8');
        ignoreToClean = gitignoreContent
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line && !line.startsWith('#'));
      }
    } catch (error) {
      logger.warn('read .gitignore file failed:', error.message);
    }

    // merge filesToClean and ignoreToClean, and remove duplicate items
    filesToClean = Array.from(new Set([...filesToClean, ...ignoreToClean]));
  }

  if (filesToClean.length === 0) {
    logger.log('none files to clean');
    return;
  }

  const ig = ignore().add(filesToClean);

  if (options.dryrun) {
    logger.info('preview mode - the following files will be deleted:');
  }

  const deleteFiles = (dir) => {
    if (existsSync(dir)) {
      const files = readdirSync(dir);
      files.forEach((file) => {
        const fullPath = join(dir, file);
        const relativePath = relative(process.cwd(), fullPath);
        const isDirectory = lstatSync(fullPath).isDirectory();

        if (ig.ignores(relativePath)) {
          if (options.dryrun) {
            logger.info(
              `will delete ${isDirectory ? 'directory' : 'file'}: ${fullPath}`
            );
          } else {
            try {
              rimraf(fullPath);
              logger.info(
                `deleted ${isDirectory ? 'directory' : 'file'}: ${fullPath}`
              );
            } catch (error) {
              logger.error(`failed to delete ${fullPath}: ${error.message}`);
            }
          }
        } else if (isDirectory && options.recursion) {
          // if it is a directory and recursion is enabled, process it recursively
          deleteFiles(fullPath);
        }
      });
    }
  };

  deleteFiles(process.cwd());
}

main();
