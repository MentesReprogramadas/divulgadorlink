export type ServiceWindow = { startsAt: Date; endsAt: Date }
export type PaidTimePause = { revision: number; startsAt: Date; endsAt: Date | null }
export type ServiceInvestment = ServiceWindow & { amountCents: number; pauseRevision: number }

export function remainingPaidMilliseconds(expiresAt: Date, pausedAt: Date): number {
  return Math.max(0, expiresAt.getTime() - pausedAt.getTime())
}

/** The purchased ledger remains immutable. Each later pause shifts only unconsumed service. */
export function investmentServiceWindows(investment: ServiceInvestment, pauses: PaidTimePause[]): ServiceWindow[] {
  if (investment.endsAt <= investment.startsAt || !Number.isFinite(investment.startsAt.getTime()) || !Number.isFinite(investment.endsAt.getTime())) throw new Error('Intervalo pago inválido.')
  let windows: ServiceWindow[] = [{ startsAt: investment.startsAt, endsAt: investment.endsAt }]
  for (const pause of [...pauses].filter(row => row.revision > investment.pauseRevision).sort((a, b) => a.revision - b.revision)) {
    if (pause.endsAt && pause.endsAt < pause.startsAt) throw new Error('Pausa inválida.')
    windows = windows.flatMap(window => {
      if (window.endsAt <= pause.startsAt) return [window]
      const before = window.startsAt < pause.startsAt ? [{ startsAt: window.startsAt, endsAt: pause.startsAt }] : []
      if (!pause.endsAt) return before
      const shift = pause.endsAt.getTime() - pause.startsAt.getTime()
      return [...before, { startsAt: new Date(Math.max(window.startsAt.getTime(), pause.startsAt.getTime()) + shift), endsAt: new Date(window.endsAt.getTime() + shift) }]
    })
  }
  return windows
}

export function investmentConsumedCents(investment: ServiceInvestment, pauses: PaidTimePause[], from: Date, to: Date): number {
  const duration = investment.endsAt.getTime() - investment.startsAt.getTime()
  const windows = investmentServiceWindows(investment, pauses)
  if (!Number.isSafeInteger(investment.amountCents) || investment.amountCents < 0) throw new Error('Valor pago inválido.')
  const overlap = windows.reduce((sum, window) => sum + Math.max(0, Math.min(window.endsAt.getTime(), to.getTime()) - Math.max(window.startsAt.getTime(), from.getTime())), 0)
  return Number((BigInt(investment.amountCents) * BigInt(overlap) + BigInt(duration) / 2n) / BigInt(duration))
}

export function activeServiceWindows(startsAt: Date, endsAt: Date, pauses: PaidTimePause[]): ServiceWindow[] {
  let cursor = startsAt
  const windows: ServiceWindow[] = []
  for (const pause of [...pauses].sort((a, b) => a.revision - b.revision)) {
    if (pause.startsAt > cursor) windows.push({ startsAt: cursor, endsAt: new Date(Math.min(pause.startsAt.getTime(), endsAt.getTime())) })
    cursor = pause.endsAt ?? endsAt
    if (cursor >= endsAt) break
  }
  if (cursor < endsAt) windows.push({ startsAt: cursor, endsAt })
  return windows.filter(row => row.endsAt > row.startsAt)
}
