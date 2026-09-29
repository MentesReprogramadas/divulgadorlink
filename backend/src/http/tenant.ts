import {
  InMemoryTenantsRepository,
  PrismaTenantsRepository,
  type TenantsRepository,
} from '@/repositories/tenants-repository'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'

const tenantsRepository: TenantsRepository =
  process.env.NODE_ENV === 'test'
    ? InMemoryTenantsRepository.seeded()
    : new PrismaTenantsRepository()

export async function resolveTenant(
  host: string,
  _ignored?: { tenantId?: string },
): Promise<{ id: string }> {
  const tenant = await tenantsRepository.findByHost(host)
  if (!tenant) {
    throw new ResourceNotFoundError()
  }
  return { id: tenant.id }
}
