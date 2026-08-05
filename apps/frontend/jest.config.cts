module.exports = {
  displayName: '@org/frontend',
  preset: '../../jest.preset.js',
  transform: {
    '^(?!.*\\.(js|jsx|ts|tsx|css|json)$)': '@nx/react/plugins/jest',
    '^.+\\.[tj]sx?$': ['babel-jest', { presets: ['@nx/react/babel'] }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
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
