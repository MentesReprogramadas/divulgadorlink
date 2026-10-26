import { defineConfig } from '@playwright/test'
import { acquireRunLease } from './e2e/run-lease.cjs'

// The existing runner shares build, fixture state and logs even with isolated ports.
acquireRunLease()

export default defineConfig({
  testDir: './e2e',
  testMatch: /professional-seo\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  retries: 0,
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  outputDir: './test-results/seo-professional',
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }], ['json', { outputFile: 'test-results/seo-results.json' }]],
  use: {
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    { name: 'seo-desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'seo-mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
})
