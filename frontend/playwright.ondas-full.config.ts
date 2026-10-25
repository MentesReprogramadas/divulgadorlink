import { defineConfig } from '@playwright/test'
import base from './playwright.config'

const batch = process.env.ONDAS_VISUAL_BATCH ?? 'complete'
if (!/^[a-z0-9-]+$/.test(batch)) throw new Error('Invalid visual batch name')

export default defineConfig({
  ...base,
  globalSetup: undefined,
  globalTeardown: undefined,
  timeout: 180_000,
  testMatch: /ondas-(full-.*-visual|(?:admin-hydration|hydration-stress)-diagnostic)\.spec\.ts/,
  outputDir: '../output/ondas-v24/' + batch,
  reporter: [['list'], ['json', { outputFile: '../output/ondas-v24/' + batch + '.json' }]],
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
})
