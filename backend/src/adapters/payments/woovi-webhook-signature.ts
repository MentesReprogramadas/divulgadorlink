import { createVerify, timingSafeEqual } from 'node:crypto'

export const WOOVI_PUBLISHED_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC/+NtIkjzevvqD+I3MMv3bLXDt
pvxBjY4BsRrSdca3rtAwMcRYYvxSnd7jagVLpctMiOxQO8ieUCKLSWHpsMAjO/zZ
WMKbqoG8MNpi/u3fp6zz0mcHCOSqYsPUUG19buW8bis5ZZ2IZgBObWSpTvJ0cnj6
HKBAA82Jln+lGwS1MwIDAQAB
-----END PUBLIC KEY-----`

const PAYMENT_KEYS = ['charge', 'correlationID', 'eventId', 'pix', 'payment']

export function isWooviRegistrationPing(payload: Buffer | string): boolean {
  let body: unknown
  try {
    body = JSON.parse(payload.toString())
  } catch {
    return false
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return false
  const record = body as Record<string, unknown>
  if (PAYMENT_KEYS.some((key) => key in record)) return false
  if (record.evento === 'teste_webhook') return true
  const keys = Object.keys(record)
  return keys.length > 0
    && keys.every((key) => key === 'data_criacao' || key === 'event')
    && typeof record.data_criacao === 'string'
    && typeof record.event === 'string'
    && record.event.startsWith('OPENPIX:')
}

export function verifyWooviSignature(rawBody: Buffer | string, signature: string | undefined, publicKey: string): boolean {
  if (!signature || !publicKey) return false
  try {
    const verify = createVerify('RSA-SHA256')
    verify.update(rawBody)
    verify.end()
    const valid = verify.verify(publicKey, signature, 'base64')
    const marker = Buffer.from(valid ? '1' : '0')
    return timingSafeEqual(marker, Buffer.from('1'))
  } catch {
    return false
  }
}
