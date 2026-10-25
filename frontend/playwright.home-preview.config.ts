import { defineConfig } from '@playwright/test'
import { acquireRunLease } from './e2e/run-lease.cjs'

acquireRunLease()
export default defineConfig({
  testDir: './e2e', testMatch: 'home-preview.spec.ts', workers: 1, timeout: 60_000,
  outputDir: 'test-results/home-preview', reporter: [['list']],
  snapshotPathTemplate: '{testDir}/home-preview-snapshots/{projectName}/{arg}{ext}',
  use: { baseURL: 'http://127.0.0.1:3012', locale: 'pt-BR', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: { command: 'npm run dev -- --hostname 127.0.0.1 --port 3012', url: 'http://127.0.0.1:3012/dev/home-preview', reuseExistingServer: true, timeout: 120_000, env: { TEMLINK_E2E_BUILD: '1', API_ORIGIN: 'http://127.0.0.1:4098', ANALYTICS_TEST_MODE: '1' } },
  projects: [
    { name: 'home-desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'home-mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
})
