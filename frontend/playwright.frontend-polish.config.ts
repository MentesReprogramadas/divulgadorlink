import { defineConfig } from '@playwright/test'
import base from './playwright.config'

export default defineConfig({
  ...base,
  timeout: 180_000,
  projects: [
    { name: 'polish-desktop', testMatch: /frontend-polish\.spec\.ts|frontend-experience\.spec\.ts|link-media\.spec\.ts|google-ads-submission\.spec\.ts/, use: { viewport: { width: 1440, height: 900 } } },
    { name: 'polish-mobile', testMatch: /frontend-polish\.spec\.ts|frontend-experience\.spec\.ts|link-media\.spec\.ts|google-ads-submission\.spec\.ts/, use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
})
