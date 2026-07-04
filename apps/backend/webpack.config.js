const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

// Server SDKs that must run from node_modules, not be bundled: they hook module loading at runtime
// (require/import-in-the-middle) or ship native/broken-sourcemap files that break webpack.
const RUNTIME_EXTERNALS =
  /^(@sentry|@opentelemetry)\/|^google-auth-library(\/|$)|^(require-in-the-middle|import-in-the-middle|standardwebhooks)$/;

module.exports = (_env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    externals: [
      {
        '@nestjs/terminus': 'commonjs @nestjs/terminus',
        '@nestjs/throttler': 'commonjs @nestjs/throttler',
        'geoip-lite': 'commonjs geoip-lite',
      },
      ({ request }, callback) =>
        RUNTIME_EXTERNALS.test(request) ? callback(null, `commonjs ${request}`) : callback(),
    ],
    output: {
      path: join(__dirname, 'dist'),
      clean: true,
      ...(!isProduction && {
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
};
