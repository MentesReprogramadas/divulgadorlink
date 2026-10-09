import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testIgnore: ['**/global-setup.ts', '**/serve.mjs'],
  timeout: 60_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
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
    { name: 'catalog', testMatch: /catalog\.spec\.ts|mail\.spec\.ts|advertise\.spec\.ts|legal\.spec\.ts|funnel\.spec\.ts|signup\.spec\.ts|submit-link\.spec\.ts|security-headers\.spec\.ts/, dependencies: ['setup'] },
  ],
})
