import { PrismaClient } from '@prisma/client'

const host = process.env.TENANT_HOST
const name = process.env.TENANT_NAME || host

if (!host || host === 'localhost') {
  console.error('TENANT_HOST precisa ser o domínio público do site.')
  process.exit(1)
}

const prisma = new PrismaClient()

try {
  await prisma.tenant.upsert({
    where: { host },
    create: { host, name },
    update: {},
  })
} finally {
  await prisma.$disconnect()
}
