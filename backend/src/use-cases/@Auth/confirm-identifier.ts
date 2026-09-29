export const RESEND_WINDOW_MS = 60 * 60 * 1000

export function canSubmitLink(user: {
  emailConfirmed: boolean
  phoneConfirmed: boolean
  status: 'ACTIVE' | 'BANNED'
}): boolean {
  return user.status === 'ACTIVE' && user.emailConfirmed && user.phoneConfirmed
}

export function assertResendAllowed(sentInWindow: number): true {
  if (sentInWindow >= 5) throw new Error('limite de reenvio')
  return true
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

export type IdentifierSnapshot = {
  kind: 'EMAIL' | 'PHONE'
  confirmedAt: Date | null
  replacedAt: Date | null
}

export function confirmationFlags(identifiers: IdentifierSnapshot[]): {
  emailConfirmed: boolean
  phoneConfirmed: boolean
} {
  const current = identifiers.filter((row) => row.replacedAt === null)
  const email = current.find((row) => row.kind === 'EMAIL')
  const phone = current.find((row) => row.kind === 'PHONE')
  return {
    emailConfirmed: Boolean(email?.confirmedAt),
    phoneConfirmed: Boolean(phone?.confirmedAt),
  }
}

export function canSubmitLinkFromIdentifiers(
  status: 'ACTIVE' | 'BANNED',
  identifiers: IdentifierSnapshot[],
): boolean {
  return canSubmitLink({ ...confirmationFlags(identifiers), status })
}

export function currentIdentifier(
  identifiers: IdentifierSnapshot[],
  kind: 'EMAIL' | 'PHONE',
): IdentifierSnapshot | undefined {
  return identifiers.find((row) => row.kind === kind && row.replacedAt === null)
}
