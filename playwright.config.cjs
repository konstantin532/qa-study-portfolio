const { defineConfig, devices } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests', timeout: 30_000, expect: { timeout: 5_000 },
  fullyParallel: false, retries: process.env.CI ? 2 : 0, workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'on-first-retry', screenshot: 'only-on-failure', video: 'retain-on-failure' },
  webServer: { command: 'npm run serve', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI, timeout: 30_000 },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 5'] } }
  ]
});
