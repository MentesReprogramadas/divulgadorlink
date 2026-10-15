import { defineConfig } from '@playwright/test'
import base from './playwright.config'

export default defineConfig({
  ...base,
  globalSetup: undefined,
  globalTeardown: undefined,
  testMatch: /admin-promotions\.spec\.ts/,
  use: { ...base.use, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', reducedMotion: 'reduce' },
  projects: [
    { name: 'admin-desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'admin-mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
})
