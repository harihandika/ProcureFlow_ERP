import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  timeout: 120_000,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'powershell -NoProfile -ExecutionPolicy Bypass -File ./e2e/start-api.ps1',
      url: 'http://localhost:4001/api/docs',
      reuseExistingServer: !process.env.CI,
      timeout: 240_000,
    },
    {
      command: 'powershell -NoProfile -ExecutionPolicy Bypass -File ./e2e/start-web.ps1',
      url: 'http://localhost:3000/login',
      reuseExistingServer: !process.env.CI,
      timeout: 240_000,
    },
  ],
});
