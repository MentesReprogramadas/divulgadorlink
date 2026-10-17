const offset = Number(process.env.E2E_PORT_OFFSET || 0)
const runId = process.env.E2E_RUN_ID || ''
if (!Number.isInteger(offset) || offset < 0 || offset > 50000 || !/^[a-z0-9-]{0,40}$/.test(runId)) throw new Error('Configuração E2E inválida')
const webPort = 3000 + offset, apiPort = 3333 + offset, stubPort = 4099 + offset
const pgPort = 5433 + offset, redisPort = 6380 + offset
exports.runtime = {
  webPort, apiPort, stubPort, pgPort, redisPort, externalPort: 4443 + offset,
  pgContainer: 'divulgador-e2e-pg' + (runId ? '-' + runId : ''),
  redisContainer: 'divulgador-e2e-redis' + (runId ? '-' + runId : ''),
  databaseUrl: 'postgresql://divulgador:divulgador@127.0.0.1:' + pgPort + '/divulgador?schema=public',
  redisUrl: 'redis://127.0.0.1:' + redisPort,
  apiOrigin: 'http://127.0.0.1:' + apiPort,
  stubOrigin: 'http://127.0.0.1:' + stubPort,
  web: (host = 'tenant-a.localhost') => 'http://' + host + ':' + webPort,
}
