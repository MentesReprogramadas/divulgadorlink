import { PrismaClient } from '@prisma/client'
import { supportDatabaseUrl, supportReadContext } from '@/lib/support-read-context'

export type TenantRecord = {
  id: string
  host: string
  name: string
}

export interface TenantsRepository {
  findByHost(host: string): Promise<TenantRecord | null>
}

export class InMemoryTenantsRepository implements TenantsRepository {
  constructor(private readonly items: TenantRecord[] = []) {}

  static seeded(): InMemoryTenantsRepository {
    return new InMemoryTenantsRepository([
      { id: 'seed-temlinkaqui', host: 'temlinkaqui.com', name: 'Tem Link Aqui' },
    ])
  }

  async findByHost(host: string): Promise<TenantRecord | null> {
    return this.items.find((tenant) => tenant.host === host) ?? null
  }
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; supportPrisma?: PrismaClient }

const primary = globalForPrisma.prisma ?? new PrismaClient()
let supportClient = globalForPrisma.supportPrisma
function readOnlyClient(): PrismaClient {
  if (!supportClient) {
    supportClient = new PrismaClient({ datasourceUrl: supportDatabaseUrl(process.env.DATABASE_URL!) })
    if (process.env.NODE_ENV !== 'production') globalForPrisma.supportPrisma = supportClient
  }
  return supportClient
}
// Route all repository access, including raw SQL and interactive transactions,
// through PostgreSQL's read-only pool while a support GET is executing.
export const prisma = new Proxy(primary, {
  get(target, property) {
    const client = supportReadContext.getStore() ? readOnlyClient() : target
    const value: unknown = Reflect.get(client, property)
    return typeof value === 'function' ? value.bind(client) : value
  },
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = primary
}

export class PrismaTenantsRepository implements TenantsRepository {
  async findByHost(host: string): Promise<TenantRecord | null> {
    const tenant = await prisma.tenant.findUnique({ where: { host } })
    if (!tenant) {
      return null
    }
    return { id: tenant.id, host: tenant.host, name: tenant.name }
  }
}
