import { PrismaClient } from '@prisma/client'

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

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
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
