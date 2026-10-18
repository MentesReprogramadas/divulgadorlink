import { defineConfig } from '@playwright/test'
import base from './playwright.config'
export default defineConfig({ ...base, projects: [
  { name: 'support-desktop', testMatch: /support-mode\.spec\.ts/, use: { viewport: { width: 1440, height: 900 } } },
  { name: 'support-mobile', testMatch: /support-mode\.spec\.ts/, use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
] })
