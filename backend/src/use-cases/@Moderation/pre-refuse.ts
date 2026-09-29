import { canonicalUrl } from '@/domain/links/canonical-url'

export function preRefuse(input: {
  phoneHistory: string[]
  bannedPhones: string[]
  emailHistory: string[]
  bannedEmails: string[]
  url: string
  bannedUrls: string[]
  ip?: string
}): { refused: boolean; signals: Array<'phone' | 'email' | 'url'> } {
  const signals: Array<'phone' | 'email' | 'url'> = []
  if (input.phoneHistory.some((phone) => input.bannedPhones.includes(phone))) signals.push('phone')
  if (input.emailHistory.some((email) => input.bannedEmails.includes(email))) signals.push('email')
  const url = canonicalUrl(input.url)
  if (input.bannedUrls.map(canonicalUrl).includes(url)) signals.push('url')
  return { refused: signals.length > 0, signals }
}
