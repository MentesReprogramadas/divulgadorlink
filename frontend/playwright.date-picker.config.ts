import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e', testMatch: 'date-picker.spec.ts', workers: 1,
  reporter: [['list']], outputDir: 'test-results/date-picker',
  use: { baseURL: 'http://localhost:6007', screenshot: 'only-on-failure' },
  webServer: { command: 'npm run storybook -- --ci --no-open --port 6007', url: 'http://localhost:6007', reuseExistingServer: true, timeout: 120_000 },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
})
