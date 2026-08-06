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
    '^.+\\.[tj]s$': ['@swc/jest', swcJestConfig],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'html'],
  // otplib and its base32 dependency ship ESM only; jest runs CommonJS, so they have to be
  // transformed rather than skipped along with the rest of node_modules.
  transformIgnorePatterns: ['node_modules/(?!.*(?:otplib|@scure|@noble))'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/dist/'],
  coverageDirectory: 'test-output/jest/coverage',
};
