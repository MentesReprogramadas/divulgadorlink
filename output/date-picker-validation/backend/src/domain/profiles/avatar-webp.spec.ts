import { readFileSync } from 'node:fs'
import sharp from 'sharp'
import { expect, it } from 'vitest'
import { avatarWebp, avatarContentType } from './avatar-webp'
it('reencodes PNG and WebP into bounded WebP without metadata', async () => {
  const png = readFileSync('src/domain/profiles/avatar.fixture.png')
  for (const input of [png, await sharp(png).withExif({ IFD0: { Copyright: 'Private fixture' } }).webp().toBuffer()]) {
    const result = await avatarWebp(input.toString('base64'))
    const metadata = await sharp(result).metadata()
    expect(avatarContentType(result)).toBe('image/webp')
    expect(metadata.width).toBe(2); expect(metadata.exif).toBeUndefined(); expect(metadata.icc).toBeUndefined()
  }
  expect(avatarContentType(png)).toBe('image/png')
})
it('rejects disguised bytes, truncated WebP, excess bytes, and dimensions', async () => {
  const large = await sharp({ create: { width: 513, height: 1, channels: 3, background: '#ffffff' } }).webp().toBuffer()
  for (const input of [Buffer.from('<svg/>'), Buffer.alloc(262145), large, Buffer.from('RIFFxxxxWEBP')]) await expect(avatarWebp(input.toString('base64'))).rejects.toThrow()
})
