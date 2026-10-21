import { defineConfig } from '@playwright/test'
import { acquireRunLease } from './e2e/run-lease.cjs'

// Reserve before Playwright clears its output directory or writes shared fixtures.
acquireRunLease()

export default defineConfig({
  testDir: './e2e',
  testIgnore: ['**/global-setup.ts', '**/serve.mjs', '**/.runtime/**'],
  timeout: 60_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }], ['json', { outputFile: 'test-results/results.json' }]],
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    { name: 'features', testMatch: /agency\.spec\.ts|button-tests\.spec\.ts|profile-languages\.spec\.ts|contact-handling\.spec\.ts|platform-webhooks\.spec\.ts|profile-discovery\.spec\.ts|profile-hosts\.spec\.ts|public-collections\.spec\.ts|share-kit\.spec\.ts|profile-events\.spec\.ts|ownership\.spec\.ts|profile-assistant\.spec\.ts|destination-pools\.spec\.ts|contact-forms\.spec\.ts|evolution-moderation\.spec\.ts|promotion-performance\.spec\.ts|link-reports\.spec\.ts|link-availability\.spec\.ts|renewal-reminders\.spec\.ts|related-links\.spec\.ts|favorites\.spec\.ts|profiles\.spec\.ts|profile-history\.spec\.ts|profile-billing\.spec\.ts|permanent-qr\.spec\.ts|profile-schedules\.spec\.ts|profile-templates\.spec\.ts|profile-import\.spec\.ts|profile-search\.spec\.ts|discovery-filters\.spec\.ts|profile-interaction\.spec\.ts|media-kit\.spec\.ts|profile-team\.spec\.ts|workspace-team\.spec\.ts|campaign-pages\.spec\.ts|niche-follows\.spec\.ts|profile-export\.spec\.ts|profile-checklist\.spec\.ts|profile-channels\.spec\.ts|search-opportunities\.spec\.ts|content-reviews\.spec\.ts|redirects\.spec\.ts|workspace-layout\.spec\.ts|loading-layout\.spec\.ts/, dependencies: ['setup'], timeout: 120_000 },
    { name: 'features-mobile', testMatch: /agency\.spec\.ts|button-tests\.spec\.ts|profile-languages\.spec\.ts|contact-handling\.spec\.ts|platform-webhooks\.spec\.ts|profile-discovery\.spec\.ts|profile-hosts\.spec\.ts|public-collections\.spec\.ts|share-kit\.spec\.ts|profile-events\.spec\.ts|ownership\.spec\.ts|profile-assistant\.spec\.ts|destination-pools\.spec\.ts|contact-forms\.spec\.ts|evolution-moderation\.spec\.ts|promotion-performance\.spec\.ts|link-reports\.spec\.ts|link-availability\.spec\.ts|renewal-reminders\.spec\.ts|related-links\.spec\.ts|favorites\.spec\.ts|profiles\.spec\.ts|profile-history\.spec\.ts|profile-billing\.spec\.ts|permanent-qr\.spec\.ts|profile-schedules\.spec\.ts|profile-templates\.spec\.ts|profile-import\.spec\.ts|profile-search\.spec\.ts|discovery-filters\.spec\.ts|profile-interaction\.spec\.ts|media-kit\.spec\.ts|profile-team\.spec\.ts|workspace-team\.spec\.ts|campaign-pages\.spec\.ts|niche-follows\.spec\.ts|profile-export\.spec\.ts|profile-checklist\.spec\.ts|profile-channels\.spec\.ts|search-opportunities\.spec\.ts|content-reviews\.spec\.ts|redirects\.spec\.ts|workspace-layout\.spec\.ts|loading-layout\.spec\.ts/, dependencies: ['setup'], timeout: 120_000, use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: 'catalog', testMatch: /catalog\.spec\.ts|mail\.spec\.ts|advertise\.spec\.ts|legal\.spec\.ts|funnel\.spec\.ts|signup\.spec\.ts|submit-link\.spec\.ts|security-headers\.spec\.ts|google-ads-submission\.spec\.ts/, dependencies: ['setup'] },
  ],
})
