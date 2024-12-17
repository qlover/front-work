import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';
import dts from 'rollup-plugin-dts';
import typescript from 'rollup-plugin-typescript2';
import { builtinModules } from 'module';
import { readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { Env } from '@qlover/fe-env-loader';
const pkg = JSON.parse(
  readFileSync(join(process.cwd(), 'package.json'), 'utf-8')
);

const env = Env.searchEnv();
console.log('Rollup build Enveronment is:', env.get('NODE_ENV'));
const isProduction = env.get('NODE_ENV') === 'production';
const buildDir = 'dist';

const treeshake = {
  moduleSideEffects: false,
  propertyReadSideEffects: false,
  tryCatchDeoptimization: false
};
const defaultExternal = [
  ...builtinModules,
  ...builtinModules.map((mod) => `node:${mod}`),
  // ...Object.keys(pkg.dependencies),
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
        include: ['src']
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
    input: 'src/index.ts',
    external: defaultExternal,
    output: [
      {
        file: 'dist/cjs/index.js',
        format: 'cjs'
      },
      {
        file: 'dist/es/index.js',
        format: 'es'
      },
      {
        file: 'dist/index.js',
        format: 'umd',
        name: 'FeCore'
      }
    ],
    plugins: createPlugin(isProduction),
    treeshake
  },
  {
    input: './src/index.ts',
    output: [
      {
        file: 'dist/cjs/index.d.ts',
        format: 'cjs'
      },
      {
        file: 'dist/es/index.d.ts',
        format: 'es'
      },
      {
        file: 'dist/index.d.ts',
        format: 'umd'
      }
    ],
    plugins: [dts()],
    treeshake
  }
];

export default config;
