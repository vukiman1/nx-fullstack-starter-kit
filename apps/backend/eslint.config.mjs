import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    files: [
      'libs/**/*.ts',
      'ormconfigs.ts',
      'src/api/**/*.ts',
      'src/app/app.module.ts',
      'src/app/app.provider.ts',
      'src/app/app.swagger.ts',
    ],
    rules: {
      '@nx/enforce-module-boundaries': 'off',
    },
  },
];
