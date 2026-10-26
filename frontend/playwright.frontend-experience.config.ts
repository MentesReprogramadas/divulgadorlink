import { defineConfig } from '@playwright/test'
import base from './playwright.config'

export default defineConfig({
  ...base,
  projects: [
    { name: 'experience-desktop', testMatch: /frontend-experience\.spec\.ts|home-scroll\.spec\.ts/, use: { viewport: { width: 1440, height: 900 } } },
    { name: 'experience-mobile', testMatch: /frontend-experience\.spec\.ts|home-scroll\.spec\.ts/, use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
})
