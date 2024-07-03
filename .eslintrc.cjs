// const OFF = 0;
// const WARNING = 1;
const ERROR = 2;

module.exports = {
  env: { node: true, jest: true },
  overrides: [
    {
      files: ['.eslintrc.{js,cjs}'],
      parserOptions: {
        sourceType: 'script'
      }
    },
    {
      ...require('./config/eslint/base.json'),
      files: ['packages/**/*.js', 'src/**/*.js']
    },
    {
      ...require('./config/eslint/base.ts.json'),
      files: ['packages/**/*.ts', 'src/**/*.ts']
    },
    {
      files: ['**/*.test.js', '**/*.spec.js'],
      rules: {
        // https://github.com/jest-community/eslint-plugin-jest
        'jest/no-focused-tests': ERROR,
        'jest/valid-expect': ERROR,
        'jest/valid-expect-in-promise': ERROR
      }
    }
  ],
  plugins: ['jest'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json'],
    tsconfigRootDir: __dirname
  }
};
