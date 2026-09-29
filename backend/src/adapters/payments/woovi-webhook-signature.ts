import { createHmac, timingSafeEqual } from 'node:crypto'

export function openPixHmac(rawBody: Buffer | string, secret: string): string {
  return createHmac('sha1', secret).update(rawBody).digest('base64')
}

export function openPixSignatureMatches(rawBody: Buffer | string, header: string | undefined, secret: string | undefined): boolean {
  if (!header || !secret) return false
  const expected = openPixHmac(rawBody, secret)
  const left = Buffer.from(header)
  const right = Buffer.from(expected)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}
