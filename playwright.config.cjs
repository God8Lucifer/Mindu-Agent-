const { defineConfig, devices } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests/browser',
  timeout: 25000,
  fullyParallel: true,
  use: { baseURL: 'http://127.0.0.1:3109', reducedMotion: 'reduce', trace: 'retain-on-failure' },
  projects: [
    { name: 'android-chromium', use: { ...devices['Pixel 7'] } },
    { name: 'iphone-webkit', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: 'npm start -- --port 3109',
    url: 'http://127.0.0.1:3109/api/health',
    reuseExistingServer: false,
    env: { OPENAI_API_KEY: '' },
  },
});
