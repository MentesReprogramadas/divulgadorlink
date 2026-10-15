import { spawn } from 'node:child_process'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('expiração do Pix por HTTP, API e worker reais, TTL de teste', () => {
  it('checkout Pix fica pendente, expira, libera o hold e não ativa promoção', async () => {
    const output = await new Promise<string>((resolve, reject) => {
      const child = spawn('npx', ['tsx', 'scripts/prove-pix-expiration.ts'], {
        cwd: path.resolve(__dirname, '../../..'),
        shell: true,
        env: {
          NODE_ENV: 'dev',
          REDIS_URL: 'redis://127.0.0.1:6380',
          DATABASE_URL: 'postgresql://divulgador:divulgador@127.0.0.1:5433/divulgador?schema=public',
          JWT_SECRET: 'test-jwt-secret-min-16',
          PATH: process.env.PATH,
          SystemRoot: process.env.SystemRoot,
        },
      })
      let text = ''
      child.stdout.on('data', (chunk) => { text += String(chunk) })
      child.stderr.on('data', (chunk) => { text += String(chunk) })
      child.on('error', reject)
      child.on('close', (code) => {
        if (code !== 0) reject(new Error(text || `prova saiu ${code}`))
        else resolve(text)
      })
    })
    const report = JSON.parse(output.split('\n').find((line) => line.startsWith('{"ttlSeconds"')) ?? '{}') as {
      pending?: { status: string; hold: string[] }
      expired?: { status: string; hold: string[]; promotions: number }
      leftovers?: string[]
      expiredAfterMs?: number
    }
    expect(report.pending).toMatchObject({ status: 'PENDING_PAYMENT', hold: ['PENDING_PAYMENT'] })
    expect(report.expired).toEqual({ status: 'EXPIRED', hold: ['RELEASED'], promotions: 0 })
    expect(report.expiredAfterMs).toBeLessThan(30_000)
    expect(report.leftovers).toEqual([])
    expect(output).toContain('ok')
  }, 120_000)
})
