import { createServer } from 'node:http'
import { spawn, spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Requires the isolated build: TEMLINK_E2E_BUILD=1 npm run build.
const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const fixture = createServer((req, res) => {
  res.setHeader('content-type', 'application/json')
  if (req.method !== 'GET') { res.writeHead(405); res.end('{}'); return }
  const slug = /^\/api\/v1\/public\/affiliates\/(natal|pausado)$/.exec(req.url ?? '')?.[1]
  res.writeHead(slug ? 200 : 404)
  res.end(JSON.stringify(slug ? { name: 'Ofertas de Natal', description: 'Convite isolado', available: slug === 'natal', imageUrl: '/brand/confluencia/simbolo-escuro.svg', shareImageUrl: null } : {}))
})
await new Promise((resolve, reject) => { fixture.once('error', reject); fixture.listen(4461, '127.0.0.1', resolve) })
const child = spawn(process.execPath, [path.join(frontend, 'node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', '3021'], { cwd: frontend, env: { ...process.env, TEMLINK_DEMO_BUILD: '0', TEMLINK_E2E_BUILD: '1', API_ORIGIN: 'http://127.0.0.1:4461', TENANT_HOST: 'temlinkaqui.com' }, stdio: 'inherit', windowsHide: true })
let stopping = false
function shutdown(code = 0) {
  if (stopping) return
  stopping = true
  if (child.pid) { if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore', windowsHide: true }); else child.kill('SIGTERM') }
  fixture.close(() => process.exit(code))
}
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => shutdown())
child.once('error', () => shutdown(1)); child.once('exit', code => shutdown(code ?? 1))
