import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  workers: 1,
  retries: process.env.CI ? 2 : 0, // CI runners are slower; a spec that passes on retry shows as flaky, not red
  reporter: [['list']],
  use: {
    baseURL: process.env.APP_WEB ?? 'http://localhost:9490',
    testIdAttribute: 'data-testid',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  outputDir: '/tmp/prata-raja-e2e-results',
});
