const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

// Server SDKs that must run from node_modules, not be bundled: they hook module loading at runtime
// (require/import-in-the-middle) or ship native/broken-sourcemap files that break webpack.
const RUNTIME_EXTERNALS =
  /^(@sentry|@opentelemetry)\/|^google-auth-library(\/|$)|^(require-in-the-middle|import-in-the-middle)$/;

module.exports = (_env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    externals: [
      {
        '@nestjs/terminus': 'commonjs @nestjs/terminus',
        '@nestjs/throttler': 'commonjs @nestjs/throttler',
        // bundling express picks the ESM build of is-promise, and the CommonJS interop of that
        // leaves express' error handler calling a namespace object ("isPromise is not a function")
        express: 'commonjs express',
      },
      ({ request }, callback) =>
        RUNTIME_EXTERNALS.test(request) ? callback(null, `commonjs ${request}`) : callback(),
    ],
    // standardwebhooks publishes source maps pointing at .ts files it does not ship
    ignoreWarnings: [{ module: /standardwebhooks/, message: /Failed to parse source map/ }],
    output: {
      path: join(__dirname, 'dist'),
      clean: true,
      // serverless.js is required by the Vercel function wrapper, so the bundle has to expose its
      // exports; main.js bootstraps itself on load and is unaffected.
      library: { type: 'commonjs2' },
      ...(!isProduction && {
        devtoolModuleFilenameTemplate: '[absolute-resource-path]',
      }),
    },
    plugins: [
      new NxAppWebpackPlugin({
        target: 'node',
        compiler: 'tsc',
        main: './src/main.ts',
        additionalEntryPoints: [{ entryName: 'serverless', entryPath: './src/serverless.ts' }],
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
    module: {
      // config-bootstrap.ts inlines these so the serverless bundle carries its own config
      rules: [{ test: /\.ya?ml$/, type: 'asset/source' }],
    },
    resolve: {
      // 'require' before 'import': the output is CommonJS, and dual-build packages such as
      // is-promise break interop when their ESM entry is bundled instead
      conditionNames: ['@org/source', 'require', 'node', 'import', 'default'],
      // same reason, for packages that expose their ESM build through "module" instead of "exports"
      mainFields: ['main', 'module'],
      plugins: [
        new TsconfigPathsPlugin({
          configFile: join(__dirname, 'tsconfig.app.json'),
        }),
      ],
    },
  };
};
