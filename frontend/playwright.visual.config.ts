import { defineConfig } from '@playwright/test'
import base from './playwright.config'

export default defineConfig({
  ...base,
  testMatch: /ui-quality\.spec\.ts|admin-promotions\.spec\.ts|workspace-layout\.spec\.ts|loading-layout\.spec\.ts/,
  snapshotPathTemplate: '{testDir}/visual-baselines/{projectName}/{arg}{ext}',
  projects: [
    { name: 'ui-desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'ui-mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
})
