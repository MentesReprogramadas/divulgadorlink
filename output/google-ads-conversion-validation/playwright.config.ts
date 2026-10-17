import { defineConfig } from '../../frontend/node_modules/@playwright/test'

export default defineConfig({
  testDir: '../../frontend/e2e',
  testMatch: /google-ads-submission\.spec\.ts/,
  outputDir: './test-results',
  timeout: 60000,
  expect: { timeout: 20000 },
  workers: 1,
  reporter: [['list'], ['json', { outputFile: './results.json' }]],
  use: { baseURL: 'http://localhost:3105', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: 'node node_modules/next/dist/bin/next start -p 3105',
    cwd: './frontend',
    url: 'http://localhost:3105/painel/links/novo',
    reuseExistingServer: false,
    env: { API_ORIGIN: 'http://127.0.0.1:1' },
    timeout: 60000,
  },
})
