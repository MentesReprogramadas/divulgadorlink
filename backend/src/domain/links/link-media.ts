import sharp from 'sharp'
import { z } from 'zod'
import { avatarWebp } from '@/domain/profiles/avatar-webp'

export type LinkMediaKind = 'ICON' | 'IMAGE'
export type PreparedLinkMedia = { kind: LinkMediaKind; bytes: Buffer; alt: string | null }
export class LinkMediaError extends Error {
  constructor(public status: number, message: string) { super(message) }
}
const base64 = z.string().min(1).max(1398104)
export const iconBody = z.object({ base64 }).strict()
export const imageBody = z.object({ base64, alt: z.string().trim().min(1).max(250) }).strict()
export const submissionMedia = z.object({ icon: iconBody.optional(), image: imageBody.optional() }).strict()
export function linkMediaBody(kind: LinkMediaKind) { return kind === 'ICON' ? iconBody : imageBody }
export const linkMediaWidth = z.enum(['64', '128', '320', '640', '960', '1280', '1600']).transform(Number)

export function resizeLinkMedia(bytes: Uint8Array, width: number): Promise<Buffer> {
  return sharp(bytes, { limitInputPixels: 1600 * 1600, failOn: 'warning' })
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 })
    .toBuffer()
}

export async function prepareLinkMedia(kind: LinkMediaKind, input: unknown): Promise<PreparedLinkMedia> {
  const parsed = linkMediaBody(kind).safeParse(input)
  const invalid = () => new LinkMediaError(400, kind === 'ICON' ? 'Escolha um ícone PNG ou WebP de até 512 px e 256 KB.' : 'Escolha uma imagem PNG ou WebP de até 1600 px e 1 MB, com descrição de até 250 caracteres.')
  if (!parsed.success) throw invalid()
  const data = parsed.data
  if (kind === 'ICON') {
    try { return { kind, bytes: await avatarWebp(data.base64), alt: null } } catch { throw invalid() }
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(data.base64)) throw invalid()
  const bytes = Buffer.from(data.base64, 'base64')
  if (bytes.length > 1048576) throw invalid()
  try {
    const image = sharp(bytes, { limitInputPixels: 1600 * 1600, failOn: 'warning' })
    const meta = await image.metadata()
    if (!['png', 'webp'].includes(meta.format ?? '') || !meta.width || !meta.height || meta.width > 1600 || meta.height > 1600 || (meta.pages ?? 1) > 1) throw invalid()
    const output = await image.rotate().webp({ quality: 82, effort: 4 }).toBuffer()
    if (output.length > 1048576) throw invalid()
    return { kind, bytes: output, alt: imageBody.parse(input).alt }
  } catch { throw invalid() }
}

