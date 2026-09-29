import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    exclude: ['build/**', 'node_modules/**'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://divulgador:divulgador@localhost:5432/divulgador',
      REDIS_URL: 'redis://localhost:6379',
      JWT_SECRET: 'test-jwt-secret-min-16',
      STRIPE_WEBHOOK_SECRET: 'whsec_test',
      WOOVI_WEBHOOK_SECRET: 'woovi-test-secret',
    },
  },
})
