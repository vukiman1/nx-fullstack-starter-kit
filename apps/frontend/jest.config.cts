module.exports = {
  displayName: '@org/frontend',
  preset: '../../jest.preset.js',
  transform: {
    '^(?!.*\\.(js|jsx|ts|tsx|css|json)$)': '@nx/react/plugins/jest',
    '^.+\\.[tj]sx?$': ['babel-jest', { presets: ['@nx/react/babel'] }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  // seroval (via @tanstack/react-router) ships `import.meta.env`, which Jest cannot parse
  // unless the package goes through the babel transform.
  transformIgnorePatterns: ['/node_modules/(?!.*seroval)'],
  // Resolve the `@/` alias deterministically; without it, `@/` resolution leans on the
  // babel transform and breaks in the root multi-project jest run.
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFiles: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory: 'test-output/jest/coverage',
};
