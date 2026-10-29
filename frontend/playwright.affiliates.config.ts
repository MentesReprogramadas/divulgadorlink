import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e', testMatch: 'affiliates-ui.spec.ts', workers: 1, retries: 0, timeout: 60_000,
  outputDir: 'test-results/affiliates-ui', reporter: [['list']],
  use: { baseURL: 'http://localhost:3016', locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', reducedMotion: 'reduce', trace: 'retain-on-failure' },
  webServer: { command: 'npm run dev -- --port 3016', url: 'http://localhost:3016', reuseExistingServer: !process.env.CI, env: { TEMLINK_DEMO_BUILD: '1' }, timeout: 120_000 },
  projects: [{ name: 'affiliates-desktop', use: { viewport: { width: 1440, height: 900 } } }, { name: 'affiliates-mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } }],
})
