import { defineConfig } from '@playwright/test'
import { acquireRunLease } from './e2e/run-lease.cjs'

acquireRunLease()
// Uses an already running preview; never starts or stops another local application.
export default defineConfig({
  testDir: './e2e', testMatch: 'ondas-preview.spec.ts', workers: 1, timeout: 60_000,
  outputDir: 'test-results/ondas', reporter: [['list']],
  snapshotPathTemplate: '{testDir}/ondas-snapshots/{projectName}/{arg}{ext}',
  use: { baseURL: process.env.TEMLINK_PREVIEW_URL ?? 'http://127.0.0.1:3013', locale: 'pt-BR', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'ondas-desktop', use: { viewport: { width: 1440, height: 1080 } } },
    { name: 'ondas-mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
})
