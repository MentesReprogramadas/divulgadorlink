import { execFileSync } from 'node:child_process'
import { request as httpRequest } from 'node:http'
import path from 'node:path'

export function sql(statement: string): string {
  return execFileSync('docker', [
    'exec', '-i', 'divulgador-e2e-pg',
    'psql', '-U', 'divulgador', '-d', 'divulgador', '-t', '-A', '-c', statement,
  ], { encoding: 'utf8' }).trim()
}

export function redisScan(pattern: string): string {
  return execFileSync('docker', [
    'exec', 'divulgador-e2e-redis', 'redis-cli', '--scan', '--pattern', pattern,
  ], { encoding: 'utf8' }).trim()
}

export function promoteJob(jobId: string): string {
  return execFileSync('npx', ['tsx', 'scripts/promote-job.ts', jobId], {
    cwd: path.resolve(__dirname, '../../backend'),
    encoding: 'utf8',
    shell: true,
    env: { ...process.env, REDIS_URL: 'redis://127.0.0.1:6380' },
  }).trim()
}

export function getRaw(path: string, host: string): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const req = httpRequest({ hostname: '127.0.0.1', port: 3333, path, method: 'GET', headers: { host } }, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => resolve({ status: res.statusCode ?? 0, text: Buffer.concat(chunks).toString() }))
    })
    req.on('error', reject)
    req.end()
  })
}

export function postRaw(input: {
  path: string
  host: string
  headers?: Record<string, string>
  body?: string
}): Promise<{ status: number; text: string }> {
  const body = input.body ?? ''
  return new Promise((resolve, reject) => {
    const req = httpRequest({
      hostname: '127.0.0.1',
      port: 3333,
      path: input.path,
      method: 'POST',
      headers: {
        host: input.host,
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body),
        ...(input.headers ?? {}),
      },
    }, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => resolve({ status: res.statusCode ?? 0, text: Buffer.concat(chunks).toString() }))
    })
    req.on('error', reject)
    req.end(body)
  })
}
