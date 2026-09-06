import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.', testMatch: 'review.browser.mjs', workers: 1, reporter: 'list',
  outputDir: process.env.LARP_BROWSER_OUTPUT ?? '/tmp/larp-review-browser-results',
  use: { baseURL: 'http://127.0.0.1:4173', headless: true },
  webServer: { command: 'node review-server.mjs --demo', url: 'http://127.0.0.1:4173', reuseExistingServer: false },
});
