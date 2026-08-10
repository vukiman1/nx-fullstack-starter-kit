const { readFileSync } = require('fs');

// Reading the SWC compilation config for the spec files
const swcJestConfig = JSON.parse(readFileSync(`${__dirname}/.spec.swcrc`, 'utf-8'));

// Disable .swcrc look-up by SWC core because we're passing in swcJestConfig ourselves
swcJestConfig.swcrc = false;

// .tsx (React Email templates) needs JSX parsing + the automatic runtime.
const swcTsxConfig = {
  ...swcJestConfig,
  jsc: {
    ...swcJestConfig.jsc,
    parser: { ...swcJestConfig.jsc.parser, tsx: true },
    transform: {
      ...swcJestConfig.jsc.transform,
      react: { runtime: 'automatic' },
    },
  },
};

module.exports = {
  displayName: '@org/backend',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx$': ['@swc/jest', swcTsxConfig],
    '^.+\\.m?[tj]s$': ['@swc/jest', swcJestConfig],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'mjs', 'html'],
  // node-config v5 is ESM under a CJS entry; Node can require() it but Jest has to transpile it.
  transformIgnorePatterns: ['node_modules/.pnpm/(?!config@)'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/dist/'],
  coverageDirectory: 'test-output/jest/coverage',
};
