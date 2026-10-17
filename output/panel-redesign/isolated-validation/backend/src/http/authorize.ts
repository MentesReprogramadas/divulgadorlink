export function authorize(input: {
  actorId: string
  tenantId: string
  ownerId: string
  resourceTenantId: string
  role: 'USER' | 'ADMIN'
  action: string
}): boolean {
  if (input.tenantId !== input.resourceTenantId) return false
  if (input.role === 'ADMIN') return true
  return input.actorId === input.ownerId
}
