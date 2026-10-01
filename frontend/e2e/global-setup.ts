import { spawn, spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { connect } from 'node:net'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const PG = 'divulgador-e2e-pg'
const REDIS = 'divulgador-e2e-redis'
const backend = path.join(__dirname, '../../backend')
const databaseUrl = 'postgresql://divulgador:divulgador@127.0.0.1:5433/divulgador?schema=public'

function run(command: string, args: string[], cwd = backend): void {
  const result = spawnSync(command, args, {
    cwd,
    env: { ...process.env, DATABASE_URL: databaseUrl, NODE_ENV: 'dev' },
    stdio: 'inherit',
    shell: true,
  })
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} falhou`)
}

function listening(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ host: '127.0.0.1', port })
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('error', () => resolve(false))
  })
}

async function assertPortsFree(): Promise<void> {
  const busy: number[] = []
  for (const port of [3000, 3333, 4099]) {
    if (await listening(port)) busy.push(port)
  }
  if (busy.length === 0) return
  const pidPath = path.join(__dirname, 'serve.pid')
  const previous = existsSync(pidPath) ? readFileSync(pidPath, 'utf8').trim() : 'desconhecido'
  throw new Error(
    `Portas ${busy.join(', ')} ocupadas. Um servidor de execução anterior (serve.pid=${previous}) ou outro processo ` +
      'atenderia esta suíte com estado velho. Encerre-o antes de rodar o E2E.',
  )
}

export default async function globalSetup(): Promise<void> {
  await assertPortsFree()
  spawnSync('docker', ['rm', '-f', PG, REDIS], { stdio: 'ignore', shell: true })
  run('docker', [
    'run', '-d', '--name', PG,
    '-e', 'POSTGRES_PASSWORD=divulgador',
    '-e', 'POSTGRES_USER=divulgador',
    '-e', 'POSTGRES_DB=divulgador',
    '-p', '5433:5432',
    'pgvector/pgvector:pg16',
  ])
  run('docker', ['run', '-d', '--name', REDIS, '-p', '6380:6379', 'redis:7'])
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const ready = spawnSync('docker', ['exec', PG, 'pg_isready', '-U', 'divulgador'], { stdio: 'ignore', shell: true })
    if (ready.status === 0) break
    if (attempt === 39) throw new Error('PostgreSQL do E2E não ficou pronto')
    await delay(1000)
  }
  run('npx', ['prisma', 'migrate', 'deploy'])
  run('npx', ['tsx', 'scripts/e2e-seed.ts'])
  const frontend = path.join(__dirname, '..')
  const child = spawn('node', ['e2e/serve.mjs'], {
    cwd: frontend,
    detached: true,
    stdio: 'inherit',
    shell: true,
  })
  if (!child.pid) throw new Error('não subiu o servidor do E2E')
  writeFileSync(path.join(__dirname, 'serve.pid'), String(child.pid))
  child.unref()
  for (let attempt = 0; attempt < 240; attempt += 1) {
    try {
      const response = await fetch('http://127.0.0.1:3000')
      if (response.status < 500) return
    } catch {
      // o Next ainda não escuta
    }
    await delay(1000)
  }
  throw new Error('Next não ficou pronto')
}
