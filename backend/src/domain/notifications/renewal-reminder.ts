import { createHash } from 'node:crypto'

export const RENEWAL_LEAD_MS = 3 * 86400000
export function renewalReminderPolicy(input: Record<string, string | undefined>) {
  const flag = input.RENEWAL_REMINDERS_ENABLED ?? '0'
  if (!['0', '1'].includes(flag)) throw new Error('RENEWAL_REMINDERS_ENABLED deve ser 0 ou 1')
  return { enabled: flag === '1' }
}
export function dueForRenewal(row: { status: string; administrative: boolean; expiresAt: Date | null; accountStatus: string; linkStatus: string }, now: Date): boolean {
  return row.status === 'ACTIVE' && !row.administrative && row.accountStatus === 'ACTIVE' && row.linkStatus === 'PUBLISHED'
    && row.expiresAt !== null && row.expiresAt > now && row.expiresAt.getTime() <= now.getTime() + RENEWAL_LEAD_MS
}
export function renewalWindowKey(tenantId: string, promotionId: string, expiresAt: Date): string {
  return 'renewal/' + createHash('sha256').update(JSON.stringify([tenantId, promotionId, expiresAt.toISOString(), 'EMAIL'])).digest('hex')
}
