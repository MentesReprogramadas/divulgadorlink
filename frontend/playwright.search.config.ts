import { defineConfig } from '@playwright/test'
import base from './playwright.config'

process.env.E2E_SEARCH_EMBEDDING = '1'

export default defineConfig({
  ...base,
  projects: [
    { name: 'search-desktop', testMatch: /search-regression\.spec\.ts/, use: { viewport: { width: 1440, height: 900 } } },
    { name: 'search-mobile', testMatch: /search-regression\.spec\.ts/, use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
})
