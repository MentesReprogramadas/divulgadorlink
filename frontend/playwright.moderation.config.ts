import { defineConfig } from '@playwright/test'
import base from './playwright.config'
export default defineConfig({ ...base,
  outputDir: '../output/ai-threshold-validation/e2e',
  reporter: [['list'], ['json', { outputFile: '../output/ai-threshold-validation/e2e-results.json' }]],
  projects: [
    { name: 'moderation-desktop', testMatch: /moderation-settings\.spec\.ts/, use: { viewport: { width: 1440, height: 900 } } },
    { name: 'moderation-mobile', testMatch: /moderation-settings\.spec\.ts/, use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
})
