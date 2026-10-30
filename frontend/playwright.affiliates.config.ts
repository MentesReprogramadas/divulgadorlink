import { defineConfig } from '@playwright/test'
import { acquireRunLease } from './e2e/run-lease.cjs'

acquireRunLease()

export default defineConfig({
  testDir: './e2e', testMatch: ['affiliates-ui.spec.ts','affiliate-early-handoff.spec.ts','pets-admin-settings.spec.ts'], workers: 1, retries: 0, timeout: 60_000,
  outputDir: 'test-results/affiliates-ui', reporter: [['list']],
  use: { baseURL: 'http://localhost:3016', locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', reducedMotion: 'reduce', trace: 'retain-on-failure' },
  webServer: { command: 'node e2e/affiliates-server.mjs', url: 'http://localhost:3016/health', reuseExistingServer: false, gracefulShutdown:{signal:'SIGTERM',timeout:10000}, env: { AFFILIATE_UI_PORT: '3016', AFFILIATE_UI_METADATA_PORT:'4458' }, timeout: 240_000 },
  projects: [{ name: 'affiliates-desktop', use: { viewport: { width: 1440, height: 900 } } }, { name: 'affiliates-mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } }],
})
