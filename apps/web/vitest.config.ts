import { resolve } from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    fileParallelism: false,
    globals: true,
    maxWorkers: 1,
    pool: 'threads',
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 15000,
    css: false,
  },
});
