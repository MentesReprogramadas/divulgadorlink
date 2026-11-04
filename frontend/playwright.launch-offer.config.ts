import { defineConfig } from '@playwright/test'
import base from './playwright.config'

// Reuse/keep apply only to this isolated local harness, never to production.
export default defineConfig({
  ...base,
  testMatch: /promotion-launch-offer\.spec\.ts/,
  globalSetup: process.env.E2E_REUSE_SERVER === '1' ? undefined : base.globalSetup,
  globalTeardown: process.env.E2E_KEEP_SERVER === '1' ? undefined : base.globalTeardown,
  outputDir: 'test-results/launch-offer',
  reporter: [['list'], ['html', { outputFolder: 'playwright-report-launch-offer', open: 'never' }]],
  timeout: 120_000,
  use: { ...base.use, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', reducedMotion: 'reduce' },
  projects: [
    { name: 'launch-desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'launch-mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
})
