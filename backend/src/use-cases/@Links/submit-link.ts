import { canSubmitLink } from '@/use-cases/@Auth/confirm-identifier'

export function assertCanSubmitLink(user: {
  emailConfirmed: boolean
  phoneConfirmed: boolean
  status: 'ACTIVE' | 'BANNED'
}): void {
  if (!canSubmitLink(user)) {
    throw new Error('conta não pode enviar link')
  }
}

export function decideSubmission(input: {
  openSlots: number
  networkSlug: string
  nicheSlug: string
  blocklisted: boolean
  preRefused: boolean
}): { status: 'PENDING_MODERATION' | 'PRE_REJECTED'; runAi: boolean; occupiesSlot: boolean } {
  if (input.openSlots <= 0) throw new Error('cota esgotada')
  if (input.preRefused) return { status: 'PRE_REJECTED', runAi: false, occupiesSlot: true }
  const other = input.networkSlug === 'outro' || input.nicheSlug === 'outro'
  if (other || input.blocklisted) return { status: 'PENDING_MODERATION', runAi: false, occupiesSlot: true }
  return { status: 'PENDING_MODERATION', runAi: true, occupiesSlot: true }
}
