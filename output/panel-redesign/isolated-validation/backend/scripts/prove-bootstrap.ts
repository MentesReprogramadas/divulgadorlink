import { app } from '@/app'
import { prisma } from '@/lib/prisma'

async function main(): Promise<void> {
  const live = await app.inject({ method: 'GET', url: '/api/v1/actuator/live' })
  const ready = await app.inject({ method: 'GET', url: '/api/v1/actuator/ready' })
  const vector = await prisma.$queryRawUnsafe<Array<{ embedding_type: string }>>(
    `SELECT format_type(a.atttypid, a.atttypmod) AS embedding_type
     FROM pg_attribute a
     JOIN pg_class c ON c.oid = a.attrelid
     WHERE c.relname = 'links' AND a.attname = 'embedding'`,
  )
  console.log(JSON.stringify({
    live: live.statusCode,
    ready: ready.statusCode,
    readyBody: ready.json(),
    embedding: vector[0]?.embedding_type,
  }))
  await app.close()
  await prisma.$disconnect()
  if (live.statusCode !== 200 || ready.statusCode !== 200 || vector[0]?.embedding_type !== 'vector(1536)') {
    process.exit(1)
  }
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
