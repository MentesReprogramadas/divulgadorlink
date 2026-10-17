import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { PrismaClient } from '@prisma/client'
import { simulationConfig } from '../src/domain/analytics/traffic-simulation'
import { assertDevelopment, simulateTraffic } from '../src/use-cases/@Analytics/simulate-traffic'

async function main() {
  const { values } = parseArgs({ options: {
    tenant: { type: 'string' }, run: { type: 'string' }, config: { type: 'string' },
    until: { type: 'string' }, through: { type: 'string' }, seed: { type: 'string' },
    link: { type: 'string' }, 'batch-size': { type: 'string', default: '250' },
    apply: { type: 'boolean', default: false }, rollback: { type: 'boolean', default: false },
    'remote-development': { type: 'boolean', default: false },
  } })
  assertDevelopment(process.env.NODE_ENV, process.env.DATABASE_URL ?? '', !values.apply, values['remote-development'])
  if (!values.tenant || !values.run) throw new Error('Informe --tenant ID --run NOME --until ISO (ou --config arquivo.json)')
  const file: unknown = values.config ? JSON.parse(readFileSync(values.config, 'utf8')) : {}
  if (!file || typeof file !== 'object' || Array.isArray(file)) throw new Error('Config deve ser um objeto JSON')
  const config = simulationConfig.parse({ ...file, ...(values.until ? { until: values.until } : {}), ...(values.seed ? { seed: values.seed } : {}) })
  const db = new PrismaClient()
  try {
    await simulateTraffic(db, { tenantId: values.tenant, run: values.run, config, through: new Date(values.through ?? config.until), dryRun: !values.apply, rollback: values.rollback, batchSize: Number(values['batch-size']), linkId: values.link }, row => console.log(JSON.stringify(row)))
  } finally { await db.$disconnect() }
}

main().catch(error => { console.error(error instanceof Error ? error.message : 'Falha na simulação'); process.exitCode = 1 })
