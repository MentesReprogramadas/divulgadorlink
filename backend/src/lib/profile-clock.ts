import { env } from '@/env'
let clock: () => Date = () => new Date()
export const profileNow = () => clock()
/** Explicit composition in tests only; never controlled by an HTTP parameter. */
export function setProfileClockForTest(value: (() => Date) | null) {
  if (env.NODE_ENV === 'production') throw new Error('Test clock unavailable in production')
  clock = value ?? (() => new Date())
}
