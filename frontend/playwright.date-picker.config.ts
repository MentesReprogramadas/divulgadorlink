import { defineConfig } from '@playwright/test'
import { acquireRunLease } from './e2e/run-lease.cjs'

acquireRunLease()

export default defineConfig({
  testDir: './e2e', testMatch: 'date-picker.spec.ts', workers: 1,
  reporter: [['list'], ['html', { open: 'never' }], ['json', { outputFile: 'test-results/results.json' }]], outputDir: 'test-results/date-picker',
  use: { baseURL: 'http://localhost:6007', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: { command: 'npm run storybook -- --ci --no-open --port 6007', url: 'http://localhost:6007', reuseExistingServer: !process.env.CI, timeout: 120_000 },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
})
