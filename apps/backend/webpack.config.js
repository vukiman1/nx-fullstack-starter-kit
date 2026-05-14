const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = {
  externals: [{ '@nestjs/terminus': 'commonjs @nestjs/terminus' }],
  output: {
    path: join(__dirname, 'dist'),
    clean: true,
    ...(process.env.NODE_ENV !== 'production' && {
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    }),
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets', { input: './config', glob: '**/*', output: './config' }],
      optimization: false,
      outputHashing: 'none',
      externalDependencies: 'all',
      mergeExternals: true,
      generatePackageJson: false,
      sourceMap: true,
    }),
  ],
  resolve: {
    conditionNames: ['@org/source', 'import', 'require', 'node', 'default'],
    plugins: [
      new TsconfigPathsPlugin({
        configFile: join(__dirname, 'tsconfig.app.json'),
      }),
    ],
  },
};
