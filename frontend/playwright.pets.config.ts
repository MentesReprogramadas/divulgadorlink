import config from './playwright.affiliates.config'

export default {
  ...config,
  testMatch: ['pets-landing.spec.ts', 'pets-admin-settings.spec.ts'],
  outputDir: 'test-results/pets-landing',
}
