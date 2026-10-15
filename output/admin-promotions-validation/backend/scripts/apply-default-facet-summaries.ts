import { PrismaClient } from '@prisma/client'
import { env } from '../src/env'
import { fillMissingFacetSummaries } from '../prisma/fill-facet-summaries'

const prisma = new PrismaClient()

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { host: env.TENANT_HOST } })
  if (!tenant) throw new Error(`Tenant ${env.TENANT_HOST} não existe.`)
  const filled = await fillMissingFacetSummaries(prisma, tenant.id)
  console.log(filled.length ? filled.join('\n') : 'Nenhum resumo vazio para preencher.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
