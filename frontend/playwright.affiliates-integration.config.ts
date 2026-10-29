import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e', testMatch: 'affiliates-integration.spec.ts', workers: 1, retries: 0, timeout: 90_000,
  outputDir: 'test-results/affiliates-integration', reporter: [['list']],
  use: { baseURL: 'http://localhost:3016', locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', reducedMotion: 'reduce', trace: 'retain-on-failure' },
  projects: [{ name: 'integration-desktop', use: { viewport: { width: 1440, height: 900 } } }, { name: 'integration-mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } }],
})
