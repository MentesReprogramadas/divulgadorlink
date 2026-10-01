import { spawn } from 'node:child_process'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { app } from '@/app'
import { refreshTtlSeconds, revokeRefreshJti } from '@/adapters/auth/refresh-revocation'

describe('revogação distribuída do refresh', () => {
  it('outra instância responde 401 para o jti revogado', async () => {
    await app.ready()
    const token = app.jwt.sign(
      { sub: 'ana', role: 'USER', tenantId: 'tenant-a', typ: 'refresh', jti: `jti-${Date.now()}` },
      { expiresIn: '7d' },
    )
    const decoded = app.jwt.decode<{ jti: string; exp: number }>(token)
    if (!decoded || typeof decoded === 'string' || !decoded.jti || !decoded.exp) {
      throw new Error('refresh sem jti')
    }
    await revokeRefreshJti(decoded.jti, refreshTtlSeconds(decoded.exp))

    const status = await new Promise<string>((resolve, reject) => {
      const child = spawn('npx', ['tsx', 'scripts/refresh-status.ts', token], {
        cwd: path.resolve(__dirname, '../../..'),
        shell: true,
        env: {
          NODE_ENV: 'test',
          REDIS_URL: 'redis://127.0.0.1:6380',
          DATABASE_URL: 'postgresql://divulgador:divulgador@127.0.0.1:5433/divulgador?schema=public',
          JWT_SECRET: 'test-jwt-secret-min-16',
          PATH: process.env.PATH,
        },
      })
      let out = ''
      child.stdout.on('data', (chunk) => { out += String(chunk) })
      child.stderr.on('data', (chunk) => { out += String(chunk) })
      child.on('error', reject)
      child.on('close', (code) => {
        if (code !== 0) reject(new Error(out || `filho saiu ${code}`))
        else resolve(out.trim())
      })
    })
    expect(status.trim().split('\n').at(-1)).toBe('401')
  }, 20_000)
})
