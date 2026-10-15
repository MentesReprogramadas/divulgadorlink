import { linkMachine, promotionMachine, transition } from '@/domain/state/transition'

export function banAccount(input: {
  links: { id: string; status: 'PUBLISHED' | 'PENDING_MODERATION' | 'PRE_REJECTED' | 'DRAFT' | 'UNAVAILABLE' }[]
  promotions: { id: string; status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' }[]
}) {
  return {
    userStatus: 'BANNED' as const,
    links: input.links.map((link) => ({
      id: link.id,
      status: link.status === 'UNAVAILABLE' ? link.status : transition(linkMachine, link.status, 'UNAVAILABLE'),
    })),
    promotions: input.promotions.map((promotion) => ({
      id: promotion.id,
      status: promotion.status === 'ACTIVE' ? transition(promotionMachine, 'ACTIVE', 'CANCELLED') : promotion.status,
    })),
    refunds: [] as [],
  }
}
