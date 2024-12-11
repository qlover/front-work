import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';
import dts from 'rollup-plugin-dts';
import terser from '@rollup/plugin-terser';
import { searchEnv } from '@qlover/fe-scripts/scripts/search-env.js';

const env = searchEnv({ logger: console });
const NODE_ENV = env.get('NODE_ENV');
const isProduction = NODE_ENV === 'production';
console.log('Enveronment is', NODE_ENV);

const serverExternal = ['crypto', 'buffer', 'zlib', 'axios'];
const commonExternal = ['axios'];

function createBuilder(entry, formats, external) {
  const outputs = formats.map((format) => ({
    file: `dist/${entry}/index.${format}`,
    format,
    name:
      format === 'umd'
        ? `FeUtils${entry.charAt(0).toUpperCase() + entry.slice(1)}`
        : undefined,
    sourcemap: !isProduction
  }));

  return [
    {
      input: `${entry}/index.ts`,
      output: outputs,
      plugins: [
        resolve({
          preferBuiltins: false
        }),
        commonjs(),
        typescript({ tsconfig: './tsconfig.json' }),
        isProduction && terser()
      ],
      external: external
    },
    {
      input: `${entry}/index.ts`,
      output: {
        file: `dist/${entry}/index.d.ts`,
        format: 'es'
      },
      plugins: [dts()]
    }
  ];
}

/**
 * @type {import('rollup').RollupOptions[]}
 */
export default [
  ...createBuilder('interface', ['cjs', 'esm', 'umd'], []),
  ...createBuilder('common', ['cjs', 'esm', 'umd'], commonExternal),
  ...createBuilder('server', ['cjs', 'esm'], serverExternal)
];
