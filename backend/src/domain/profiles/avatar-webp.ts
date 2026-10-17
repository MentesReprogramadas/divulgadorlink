import sharp from 'sharp'
import { ProfileError } from './profile'

/** Decode bounded pixels, discard metadata/animation and encode a single WebP frame. */
export async function avatarWebp(base64: string): Promise<Buffer> {
  const invalid = () => new ProfileError(400, 'Escolha uma foto válida de até 512 × 512 px e 256 KB.')
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length > 349528) throw invalid()
  const bytes = Buffer.from(base64, 'base64')
  if (bytes.length > 262144) throw invalid()
  try {
    const image = sharp(bytes, { limitInputPixels: 512 * 512, failOn: 'warning' })
    const meta = await image.metadata()
    if (!['png', 'webp'].includes(meta.format ?? '') || !meta.width || !meta.height || meta.width > 512 || meta.height > 512 || (meta.pages ?? 1) > 1) throw invalid()
    const output = await image.rotate().webp({ quality: 82, effort: 4 }).toBuffer()
    if (output.length > 262144) throw invalid()
    return output
  } catch { throw invalid() }
}
export function avatarContentType(bytes: Buffer): 'image/png' | 'image/webp' {
  return bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a' ? 'image/png' : 'image/webp'
}
