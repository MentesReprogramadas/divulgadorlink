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
    exclude: ['build/**', 'node_modules/**', ...(process.env.PG_SPECS ? [] : ['**/*.pg.spec.ts'])],
    env: {
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
