import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';
import dts from 'rollup-plugin-dts';
import typescript from 'rollup-plugin-typescript2';
import { builtinModules } from 'module';
import { readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { searchEnv } from '@qlover/fe-scripts';

const readJSONFile = (path) =>
  JSON.parse(readFileSync(join(process.cwd(), path), 'utf-8'));

const pkg = readJSONFile('package.json');
const tsconfig = readJSONFile('tsconfig.json');

const env = searchEnv({ logger: console });
const NODE_ENV = env.get('NODE_ENV');
const isProduction = NODE_ENV === 'production';
const buildDir = tsconfig.compilerOptions.outDir;
console.log('Enveronment is', NODE_ENV);

const treeshake = {
  moduleSideEffects: false,
  propertyReadSideEffects: false,
  tryCatchDeoptimization: false
};
const defaultExternal = [
  ...builtinModules,
  ...builtinModules.map((mod) => `node:${mod}`),
  ...Object.keys(pkg.dependencies),
  ...Object.keys(pkg.devDependencies)
];

function createPlugin(minify) {
  return [
    resolve({
      preferBuiltins: false
    }),
    commonjs(),
    json(),
    typescript({
      tsconfig: './tsconfig.json',
      tsconfigOverride: {
        compilerOptions: {
          declaration: true,
          sourceMap: true,
          inlineSourceMap: false,
          inlineSources: false,
          importHelpers: false,
          noEmitHelpers: true
        }
      }
    }),
    minify && terser()
  ].filter(Boolean);
}

function cleanBuildDir() {
  rmSync(buildDir, { recursive: true, force: true });
  console.log(`${buildDir} cleaned`);
}

cleanBuildDir();

/**
 * @type {import('rollup').RollupOptions[]}
 */
const config = [
  {
    input: {
      index: 'src/index.ts',
      'lib/index': 'src/lib/index.ts',
      'scripts/index': 'src/scripts/index.ts'
    },
    external: defaultExternal,
    output: [
      {
        dir: 'dist/cjs',
        format: 'cjs',
        preserveModules: true,
        preserveModulesRoot: 'src'
      },
      {
        dir: 'dist/es',
        format: 'es',
        preserveModules: true,
        preserveModulesRoot: 'src'
      }
    ],
    plugins: createPlugin(isProduction),
    treeshake
  },
  {
    input: './src/index.ts',
    output: [
      {
        dir: 'dist/cjs',
        format: 'es',
        preserveModules: true,
        preserveModulesRoot: 'src'
      },
      {
        dir: 'dist/es',
        format: 'es',
        preserveModules: true,
        preserveModulesRoot: 'src'
      }
    ],
    plugins: [dts()],
    treeshake
  }
];

export default config;
