import {
  InMemoryTenantsRepository,
  PrismaTenantsRepository,
  type TenantRecord,
  type TenantsRepository,
} from '@/repositories/tenants-repository'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'

let tenantsRepository: TenantsRepository =
  process.env.NODE_ENV === 'test'
    ? InMemoryTenantsRepository.seeded()
    : new PrismaTenantsRepository()

export function normalizeTenantHost(raw: string): string {
  const host = raw.split(',')[0]?.trim().toLowerCase() ?? ''
  const withoutPort = host.split(':')[0] ?? ''
  if (withoutPort === 'www.temlinkaqui.com' || withoutPort === 'links.temlinkaqui.com') return 'temlinkaqui.com'
  return withoutPort
}

export function setTenantsRepositoryForTest(repository: TenantsRepository): void {
  if (process.env.NODE_ENV !== 'test') return
  tenantsRepository = repository
}

export async function resolveTenant(
  host: string,
  _ignored?: { tenantId?: string },
): Promise<TenantRecord> {
  const tenant = await tenantsRepository.findByHost(normalizeTenantHost(host))
  if (!tenant) {
    throw new ResourceNotFoundError()
  }
  return tenant
}
