import { defineConfig } from '@playwright/test'
import base from './playwright.config'

// Separate visual contract: functional CI remains independent of OS-specific fonts.
process.env.E2E_PROFILE_VISUAL = '1'
export default defineConfig({
  ...base,
  projects: [
    { name: 'features', testMatch: /profiles\.spec\.ts/, use: { viewport: { width: 1280, height: 800 } } },
    { name: 'features-mobile', testMatch: /profiles\.spec\.ts/, use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
})
