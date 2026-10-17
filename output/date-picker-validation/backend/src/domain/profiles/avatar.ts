import { deflateSync, inflateSync } from 'node:zlib'
import { ProfileError } from './profile'
const signature = Buffer.from('89504e470d0a1a0a', 'hex')
function crc(bytes: Buffer): number {
  let n = 0xffffffff
  for (const b of bytes) { n ^= b; for (let k = 0; k < 8; k++) n = (n >>> 1) ^ (n & 1 ? 0xedb88320 : 0) }
  return (n ^ 0xffffffff) >>> 0
}
function chunk(type: string, data: Buffer): Buffer {
  const body = Buffer.concat([Buffer.from(type), data]), header = Buffer.alloc(4), checksum = Buffer.alloc(4)
  header.writeUInt32BE(data.length); checksum.writeUInt32BE(crc(body)); return Buffer.concat([header, body, checksum])
}
/** Decode bounded, non-interlaced RGB/RGBA PNG scanlines and re-encode without metadata. Never serve SVG/raw upload. */
export function avatarPng(base64: string): Buffer {
  const invalid = () => new ProfileError(400, 'Use uma imagem PNG RGB/RGBA de até 512 × 512 px e 256 KB.')
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length > 349528) throw invalid()
  const input = Buffer.from(base64, 'base64')
  if (input.length > 262144 || !input.subarray(0, 8).equals(signature)) throw invalid()
  let offset = 8, header: Buffer | null = null, ended = false, dataEnded = false
  const data: Buffer[] = []
  while (offset + 12 <= input.length) {
    const size = input.readUInt32BE(offset), end = offset + 12 + size
    if (end > input.length) throw invalid()
    const type = input.toString('ascii', offset + 4, offset + 8), body = input.subarray(offset + 8, end - 4)
    if (crc(input.subarray(offset + 4, end - 4)) !== input.readUInt32BE(end - 4)) throw invalid()
    if (type === 'IHDR') { if (header || offset !== 8 || size !== 13) throw invalid(); header = Buffer.from(body) }
    else if (type === 'IDAT') { if (!header || dataEnded) throw invalid(); data.push(body) }
    else if (type === 'IEND') { if (size || end !== input.length) throw invalid(); ended = true; break }
    else { if (data.length) dataEnded = true; if (!/^[a-z]/.test(type)) throw invalid() }
    offset = end
  }
  if (!header || !ended || !data.length) throw invalid()
  const width = header.readUInt32BE(0), height = header.readUInt32BE(4), channels = header[9] === 6 ? 4 : header[9] === 2 ? 3 : 0
  if (!width || !height || width > 512 || height > 512 || header[8] !== 8 || !channels || header[10] || header[11] || header[12]) throw invalid()
  const stride = width * channels + 1
  let decoded: Buffer
  try { decoded = inflateSync(Buffer.concat(data), { maxOutputLength: stride * height }) } catch { throw invalid() }
  if (decoded.length !== stride * height) throw invalid()
  for (let i = 0; i < height; i++) if (decoded[i * stride]! > 4) throw invalid()
  const result = Buffer.concat([signature, chunk('IHDR', header), chunk('IDAT', deflateSync(decoded)), chunk('IEND', Buffer.alloc(0))])
  if (result.length > 262144) throw invalid()
  return result
}
