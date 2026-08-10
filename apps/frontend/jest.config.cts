module.exports = {
  displayName: '@org/frontend',
  preset: '../../jest.preset.js',
  transform: {
    '^(?!.*\\.(js|jsx|mjs|ts|tsx|css|json)$)': '@nx/react/plugins/jest',
    '^.+\\.(mjs|[tj]sx?)$': ['babel-jest', { presets: ['@nx/react/babel'] }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'mjs'],
  // node-config v5 is ESM under a CJS entry; Node can require() it but Jest has to transpile it.
  transformIgnorePatterns: ['node_modules/.pnpm/(?!config@)'],
  // Resolve the `@/` alias deterministically; without it, `@/` resolution leans on the
  // babel transform and breaks in the root multi-project jest run.
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFiles: ['<rootDir>/src/test-setup.ts'],
  // Comfortably above asyncUtilTimeout so a wait reports what it could not find, not a bare timeout.
  testTimeout: 15_000,
  coverageDirectory: 'test-output/jest/coverage',
};
