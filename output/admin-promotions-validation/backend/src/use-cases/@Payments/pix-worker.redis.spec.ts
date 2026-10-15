import { spawn } from 'node:child_process'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('worker real de Pix', () => {
  it('recupera charge, expira, marca atraso e falha o estorno na terceira tentativa', async () => {
    const output = await new Promise<string>((resolve, reject) => {
      const child = spawn('npx', ['tsx', 'scripts/prove-pix-worker.ts'], {
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
    expect(output).toContain('ok')
    expect(output).toContain('"leftovers":[]')
  }, 60_000)
})
