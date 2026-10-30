import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './e2e', testMatch: 'affiliate-entry.spec.ts', workers: 1, retries: 0, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:3021', locale: 'pt-BR', reducedMotion: 'reduce' },
  webServer: { command: 'node e2e/affiliate-entry-server.mjs', url: 'http://127.0.0.1:3021/health', reuseExistingServer: false, timeout: 30000, gracefulShutdown: { signal: 'SIGTERM', timeout: 10000 } },
  projects: [{ name: 'entry-desktop', use: { viewport: { width: 1440, height: 900 } } }, { name: 'entry-mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } }],
})
