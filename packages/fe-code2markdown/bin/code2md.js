#!/usr/bin/env node

import { dirname, join, resolve } from 'path';
import { Command } from 'commander';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { ReflectionGenerater } from '../dist/es/index.js';
import { Logger } from '@qlover/fe-core';
const program = new Command();
const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  fs.readFileSync(join(__dirname, '../package.json'), 'utf-8')
);

program
  .version(pkg.version)
  .requiredOption('-p, --entryPoints <paths>', 'Entry points', (value) =>
    value.split(',')
  )
  .option(
    '-o, --outputJSONFilePath <path>',
    'Output JSON file path',
    './docs.output/code2md.json'
  )
  .option('-g, --generatePath <path>', 'Generate path', './docs.output')
  .option('-t, --tplPath <path>', 'Template path')
  .option('--onlyJson', 'Only generate JSON file')
  .option('-d, --debug', 'Debug mode');

program.parse(process.argv);

const options = program.opts();

const main = async () => {
  const { dryRun, verbose, ...opts } = options;
  const tplPath = opts.tplPath
    ? resolve(opts.tplPath)
    : resolve(opts.generatePath, './code2md.tpl.json');

  // fixed hbs root dir
  const hbsRootDir = resolve(join(__dirname, '../hbs'));

  // TODO: 检验参数
  const generaterOptions = {
    entryPoints: opts.entryPoints.map((entry) => resolve(entry)),
    outputJSONFilePath: opts.outputJSONFilePath
      ? resolve(opts.outputJSONFilePath)
      : '',
    generatePath: resolve(opts.generatePath),
    tplPath,
    basePath: process.cwd(),
    hbsRootDir
  };

  const generater = new ReflectionGenerater({
    logger: new Logger({ debug: opts.debug ?? verbose }),
    // not used
    shell: {},
    // not used
    feConfig: {},
    verbose: opts.debug ?? verbose,
    dryRun: dryRun,
    options: generaterOptions
  });

  await generater.generate(opts.onlyJson);
};

main();
