/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import { createRequire } from 'node:module';
import { fileURLToPath, URL } from 'node:url';
import { loadFrontendConfig } from './config/index';

const requireFromHere = createRequire(import.meta.url);

export default defineConfig(({ mode }) => {
  const frontendConfig = loadFrontendConfig(mode, requireFromHere);

  return {
    root: import.meta.dirname,
    cacheDir: '../../node_modules/.vite/apps/frontend',
    server: {
      port: 4200,
      host: 'localhost',
    },
    preview: {
      port: 4200,
      host: 'localhost',
    },
    define: {
      __FRONTEND_CONFIG__: JSON.stringify(frontendConfig),
    },
    plugins: [
      tanstackRouter({
        target: 'react',
      }),
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    // Uncomment this if you are using workers.
    // worker: {
    //  plugins: [],
    // },
    build: {
      outDir: './dist',
      emptyOutDir: true,
      reportCompressedSize: true,
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
  };
});
