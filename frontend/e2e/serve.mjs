import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createServer } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'

const here = path.dirname(fileURLToPath(import.meta.url))
const backend = path.resolve(here, '../../backend')
const frontend = path.resolve(here, '..')
const publicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtUZzY8Kfolf6KQKKKLsu
RIfbCHgLhNuEzIMC160xIT1y6X+GLqKJtawDhNhIqlivj6E9jo+hB//zIJ1/f79p
TX+L/xWdc/s2XmhYueCe42WOEM8cyxvbZG0JAKhOpuXqfgO0KWBbVzHg3alk4zw2
O0O7u1Dm9U9BrdvFkE/jLeiAgrkTHW0zS+DnInLtSRMf8a6+q48PCihEiNQQ5UmZ
viDXQ87y5IFJq+jt+6YfF04HukYB6LhJFtXQ7nBIjDIDqWTxHBDHTMucdVXSa2mm
kgqfglGVrZVbpAm9P7pxq2LkIdPoa0QOSkq/2OZL8TpzyXicgvDwPJG8N5JnhWLP
kwIDAQAB
-----END PUBLIC KEY-----`

const children = []

function start(args, cwd, env) {
  const child = spawn(args[0], args.slice(1), { cwd, env, stdio: 'inherit', shell: true })
  children.push(child)
  return child
}

function killTree(pid) {
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(pid), '/t', '/f'], { stdio: 'ignore', shell: true })
    return
  }
  try {
    process.kill(-pid, 'SIGKILL')
  } catch {
    try { process.kill(pid, 'SIGKILL') } catch { /* já saiu */ }
  }
}

function shutdown() {
  for (const child of children) {
    if (child.pid) killTree(child.pid)
  }
  stub.close()
  process.exit(0)
}

const stub = createServer((req, res) => {
  const chunks = []
  req.on('data', (chunk) => chunks.push(chunk))
  req.on('end', () => {
    const raw = Buffer.concat(chunks).toString()
    res.setHeader('content-type', 'application/json')
    if (req.method === 'POST' && req.url === '/api/v1/charge') {
      const body = JSON.parse(raw)
      res.end(JSON.stringify({
        charge: {
          correlationID: body.correlationID,
          status: 'ACTIVE',
          brCode: '00020126580014BR.GOV.BCB.PIX',
          expiresDate: new Date(Date.now() + (body.expiresIn ?? 1800) * 1000).toISOString(),
        },
      }))
      return
    }
    if (req.method === 'GET' && req.url?.startsWith('/api/v1/charge/')) {
      const id = decodeURIComponent(req.url.split('/').pop() ?? '')
      res.end(JSON.stringify({ charge: { correlationID: id, status: 'COMPLETED' } }))
      return
    }
    if (req.method === 'POST' && req.url?.includes('/refund')) {
      res.end(JSON.stringify({ refund: { correlationID: 'refund-stub', status: 'IN_PROCESSING' } }))
      return
    }
    res.statusCode = 404
    res.end('{}')
  })
})

stub.on('error', (error) => {
  console.error(`stub Woovi não subiu: ${error.message}`)
  process.exit(1)
})
stub.listen(4099, '127.0.0.1')

const stateFile = path.join(here, 'state.json')
for (let attempt = 0; attempt < 90; attempt += 1) {
  const ready = spawnSync('docker', ['exec', 'divulgador-e2e-pg', 'pg_isready', '-U', 'divulgador'], { stdio: 'ignore', shell: true })
  if (ready.status === 0 && existsSync(stateFile)) break
  if (attempt === 89) throw new Error('PostgreSQL do E2E não ficou pronto antes da API')
  await delay(1000)
}

const apiEnv = {
  ...process.env,
  NODE_ENV: 'dev',
  PORT: '3333',
  HOST: '0.0.0.0',
  DATABASE_URL: 'postgresql://divulgador:divulgador@127.0.0.1:5433/divulgador?schema=public',
  REDIS_URL: 'redis://127.0.0.1:6380',
  JWT_SECRET: 'e2e-jwt-secret-min-16',
  WOOVI_APP_ID: 'e2e-app',
  WOOVI_API_BASE_URL: 'http://127.0.0.1:4099',
  WOOVI_WEBHOOK_PUBLIC_KEY: publicKey,
  OPENAI_API_KEY: '',
  HDX_API_KEY: '',
  CONFIRMATION_INBOX: '1',
}
delete apiEnv.TENANT_HOST

start(['npx', 'tsx', 'src/server.ts'], backend, apiEnv)
start(['npx', 'tsx', 'src/worker.ts'], backend, apiEnv)

async function waitOk(url) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // a API ainda não escuta
    }
    await delay(500)
  }
  throw new Error(`${url} não ficou pronto`)
}

await waitOk('http://127.0.0.1:3333/api/v1/actuator/live')

const webEnv = {
  ...process.env,
  NODE_ENV: 'production',
  API_ORIGIN: 'http://127.0.0.1:3333',
}
delete webEnv.TENANT_HOST
const build = spawnSync('npx', ['next', 'build'], { cwd: frontend, env: webEnv, stdio: 'inherit', shell: true })
if (build.status !== 0) {
  for (const child of children) {
    if (child.pid) killTree(child.pid)
  }
  stub.close()
  process.exit(1)
}
start(['npx', 'next', 'start', '--hostname', '0.0.0.0', '-p', '3000'], frontend, webEnv)

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
await new Promise(() => {})
