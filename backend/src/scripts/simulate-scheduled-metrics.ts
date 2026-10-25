import 'dotenv/config'
import { parseArgs } from 'node:util'
import { PrismaClient } from '@prisma/client'
import { assertScheduledEnvironment, runScheduledTraffic } from '@/use-cases/@Analytics/scheduled-traffic'

async function main() {
  const { values } = parseArgs({ options: {
    apply: { type: 'boolean', default: false }, 'allow-production': { type: 'boolean', default: false },
  } })
  assertScheduledEnvironment(process.env.NODE_ENV, values['allow-production'])
  const db = new PrismaClient()
  try {
    await runScheduledTraffic(db, new Date(), !values.apply, row => console.log(JSON.stringify(row)))
  } finally { await db.$disconnect() }
}

main().catch(error => { console.error(error instanceof Error ? error.message : 'Falha na simulação agendada'); process.exitCode = 1 })
