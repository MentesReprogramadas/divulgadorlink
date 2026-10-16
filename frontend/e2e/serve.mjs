import { runtime as e2eRuntime } from './runtime.cjs'
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
  const child = spawn(args[0], args.slice(1), { cwd, env, stdio: 'inherit', shell: false })
  child.once('error', error => console.error('E2E child failed to start:', args[1], error.message))
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
    if (req.method === 'GET' && req.url === '/instance/connectionState/E2E%20Bot') {
      res.end(JSON.stringify({ instance: { state: evolutionFailure ? 'close' : 'open' } })); return
    }
    if (req.method === 'POST' && req.url === '/message/sendText/E2E%20Bot') {
      const body = JSON.parse(raw)
      evolutionMessages.push(body)
      if (evolutionGate) {
        evolutionHeld.push(res)
        return
      }
      res.statusCode = evolutionFailure ? 503 : 200
      res.end(JSON.stringify(evolutionFailure ? { error: 'fixture failure' } : { key: { id: 'e2e-message-' + evolutionMessages.length } }))
      return
    }
    if (req.method === 'GET' && req.url === '/evolution/messages') {
      res.end(JSON.stringify(evolutionMessages)); return
    }
    if (req.method === 'POST' && req.url === '/evolution/failure') {
      evolutionFailure = JSON.parse(raw).enabled === true
      res.end('{}'); return
    }
    if (req.method === 'POST' && req.url === '/evolution/gate') {
      evolutionGate = JSON.parse(raw).enabled === true
      if (!evolutionGate) for (const held of evolutionHeld.splice(0)) held.end(JSON.stringify({ key: { id: 'released-' + evolutionMessages.length } }))
      res.end('{}'); return
    }
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

const evolutionMessages = []
let evolutionFailure = false
let evolutionGate = false
const evolutionHeld = []
stub.on('error', (error) => {
  console.error(`stub Woovi não subiu: ${error.message}`)
  process.exit(1)
})
stub.listen(e2eRuntime.stubPort, '127.0.0.1')

const stateFile = path.join(here, 'state.json')
for (let attempt = 0; attempt < 90; attempt += 1) {
  const ready = spawnSync('docker', ['exec', e2eRuntime.pgContainer, 'pg_isready', '-U', 'divulgador'], { stdio: 'ignore', shell: true })
  if (ready.status === 0 && existsSync(stateFile)) break
  if (attempt === 89) throw new Error('PostgreSQL do E2E não ficou pronto antes da API')
  await delay(1000)
}

const apiEnv = {
  ...process.env,
  NODE_ENV: 'dev',
  PORT: String(e2eRuntime.apiPort),
  HOST: '0.0.0.0',
  DATABASE_URL: e2eRuntime.databaseUrl,
  REDIS_URL: e2eRuntime.redisUrl,
  JWT_SECRET: 'e2e-jwt-secret-min-16',
  WOOVI_APP_ID: 'e2e-app',
  WOOVI_API_BASE_URL: (e2eRuntime.stubOrigin),
  WOOVI_WEBHOOK_PUBLIC_KEY: publicKey,
  OPENAI_API_KEY: '',
  HDX_API_KEY: '',
  CONFIRMATION_INBOX: '1',
  EMAIL_OUTBOX: '1',
  TENANT_HOST: 'evolution.localhost',
  EVOLUTION_ENABLED: '1',
  EVOLUTION_ACTIONS_ENABLED: '1',
  EVOLUTION_BASE_URL: (e2eRuntime.stubOrigin),
  EVOLUTION_INSTANCE_NAME: 'E2E Bot',
  EVOLUTION_API_KEY: 'fixture-api-key',
  EVOLUTION_GROUP_JID: 'fixture@g.us',
  EVOLUTION_WEBHOOK_AUTH_SECRET: 'fixture-webhook-secret',
  EVOLUTION_OPERATOR_PHONES: '5511999999999',
  E2E_LINK_PROBE: 'example.com',
}

const tsx = path.join(backend, 'node_modules/tsx/dist/cli.mjs')
const next = path.join(frontend, 'node_modules/next/dist/bin/next')
start([process.execPath, tsx, 'src/server.ts'], backend, apiEnv)
start([process.execPath, tsx, 'src/worker.ts'], backend, apiEnv)

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

await waitOk((e2eRuntime.apiOrigin + '/api/v1/actuator/live'))

const webEnv = {
  ...process.env,
  NODE_ENV: 'production',
  API_ORIGIN: (e2eRuntime.apiOrigin),
  TENANT_HOST: '',
}
const build = spawnSync(process.execPath, [next, 'build'], { cwd: frontend, env: webEnv, stdio: 'inherit', shell: false })
if (build.status !== 0) {
  for (const child of children) {
    if (child.pid) killTree(child.pid)
  }
  stub.close()
  process.exit(1)
}
start([process.execPath, next, 'start', '--hostname', '0.0.0.0', '-p', String(e2eRuntime.webPort)], frontend, webEnv)

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
await new Promise(() => {})
