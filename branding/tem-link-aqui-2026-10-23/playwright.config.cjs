const path = require('node:path');
const { defineConfig } = require(path.join(process.cwd(), 'frontend/node_modules/@playwright/test'));
module.exports = defineConfig({
  testDir: __dirname,
  testMatch: 'showroom.spec.cjs',
  outputDir: path.join(__dirname, 'validation/test-results'),
  reporter: [['list'], ['json', { outputFile: path.join(__dirname, 'validation/tests.json') }]],
  workers: 1,
  use: { browserName: 'chromium', channel: 'msedge', headless: true },
});
