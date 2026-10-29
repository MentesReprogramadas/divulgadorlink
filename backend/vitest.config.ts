import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Vite also loads .env files; disabling dotenv alone does not isolate real provider credentials.
  envDir: false,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    // Real Pix proofs share a Redis queue and provider stubs; avoid cross-file job consumption.
    fileParallelism: false,
    exclude: ['build/**', 'node_modules/**', ...(process.env.PG_SPECS ? [] : ['**/*.pg.spec.ts'])],
    env: {
      // Tests use explicit fixtures and must never load the developer's integration secrets.
      DOTENV_CONFIG_PATH: process.platform === 'win32' ? 'NUL' : '/dev/null',
      // Prisma loads its own .env at import time; present empty values prevent merging live credentials.
      WEBHOOK_ENCRYPTION_KEY: '',
      AFFILIATE_EVOLUTION_BASE_URL: '',
      AFFILIATE_EVOLUTION_API_KEY: '',
      AFFILIATE_CATALOG_GATEWAY_URL: '',
      AFFILIATE_CATALOG_GATEWAY_KEY: '',
      AFFILIATE_SERVICE_URL: '',
      AFFILIATE_SERVICE_KEY: '',
      AFFILIATE_TAG: '',
      AFFILIATE_PROFILE: '',
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://divulgador:divulgador@127.0.0.1:1/divulgador?connect_timeout=1',
      REDIS_URL: 'redis://127.0.0.1:6380',
      JWT_SECRET: 'test-jwt-secret-min-16',
      OPENAI_API_KEY: '',
      STRIPE_WEBHOOK_SECRET: 'whsec_test',
      WOOVI_WEBHOOK_SECRET: 'woovi-test-secret',
      WOOVI_WEBHOOK_PUBLIC_KEY: `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtUZzY8Kfolf6KQKKKLsu
RIfbCHgLhNuEzIMC160xIT1y6X+GLqKJtawDhNhIqlivj6E9jo+hB//zIJ1/f79p
TX+L/xWdc/s2XmhYueCe42WOEM8cyxvbZG0JAKhOpuXqfgO0KWBbVzHg3alk4zw2
O0O7u1Dm9U9BrdvFkE/jLeiAgrkTHW0zS+DnInLtSRMf8a6+q48PCihEiNQQ5UmZ
viDXQ87y5IFJq+jt+6YfF04HukYB6LhJFtXQ7nBIjDIDqWTxHBDHTMucdVXSa2mm
kgqfglGVrZVbpAm9P7pxq2LkIdPoa0QOSkq/2OZL8TpzyXicgvDwPJG8N5JnhWLP
kwIDAQAB
-----END PUBLIC KEY-----`,
    },
  },
})
