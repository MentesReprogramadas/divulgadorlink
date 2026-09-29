/**
 * A exclusão apaga e-mail e telefone. A pré-recusa não recebe uma cópia desses
 * valores. Não há hash nem pseudônimo. Sanção depois da exclusão: decisão pendente.
 */
export const BAN_AFTER_DELETION = 'pending' as const

const IDENTITY_KEYS = new Set(['email', 'phone', 'normalizedValue', 'userId', 'actorId', 'ownerId'])

function stripIdentity(value: Record<string, unknown>, banned: Set<string>) {
  return Object.fromEntries(Object.entries(value).filter(([key, item]) => {
    if (IDENTITY_KEYS.has(key)) return false
    return typeof item !== 'string' || !banned.has(item)
  }))
}

export function anonymizeAccount(input: {
  user: { id: string; name: string; email: string; phone: string }
  identifiers: { id: string; normalizedValue: string }[]
  orders: { id: string; amountCents: number; status: string; userId: string; createdAt: Date }[]
  audits: { id: string; actorId: string; entityId: string; before: Record<string, unknown>; after?: Record<string, unknown> }[]
  links: { id: string; status: string; ownerId: string }[]
}) {
  const banned = new Set([input.user.id, input.user.name, input.user.email, input.user.phone])
  return {
    user: null,
    identifiers: [] as [],
    orders: input.orders.map((order) => ({
      id: order.id,
      amountCents: order.amountCents,
      status: order.status,
      createdAt: order.createdAt,
      userId: null as string | null,
    })),
    audits: input.audits.map((audit) => {
      const row = {
        id: audit.id,
        actorId: audit.actorId === input.user.id ? null : audit.actorId,
        entityId: audit.entityId === input.user.id ? null : audit.entityId,
        before: stripIdentity(audit.before, banned),
      }
      return audit.after === undefined ? row : { ...row, after: stripIdentity(audit.after, banned) }
    }),
    links: input.links.map((link) => ({ id: link.id, status: link.status, ownerId: null as string | null })),
  }
}
