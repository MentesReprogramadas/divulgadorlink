import { readFileSync } from 'node:fs'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { prepareLinkMedia, linkMediaBody, linkMediaWidth, resizeLinkMedia } from './link-media'

describe('link media validation', () => {
  it('offers only bounded widths and resizes actual WebP pixels without enlargement', async () => {
    const original = await sharp({ create: { width: 1600, height: 900, channels: 3, background: 'navy' } }).webp().toBuffer()
    for (const width of ['64', '128', '320', '640', '960', '1280', '1600']) {
      const pixels = await sharp(await resizeLinkMedia(original, linkMediaWidth.parse(width))).metadata()
      expect(pixels).toMatchObject({ format: 'webp', width: Number(width), height: Number(width) * 9 / 16 })
      expect(pixels.exif).toBeUndefined()
    }
    const small = await sharp({ create: { width: 32, height: 48, channels: 3, background: 'navy' } }).webp().toBuffer()
    expect(await sharp(await resizeLinkMedia(small, 128)).metadata()).toMatchObject({ width: 32, height: 48 })
    for (const width of ['', '0', '-1', '321', '640.0', '640.5', '1e3', '1601', '9999999', ['320', '640']]) {
      expect(linkMediaWidth.safeParse(width).success).toBe(false)
    }
  })
  it('accepts a bounded raster and strips metadata', async () => {
    const base64 = readFileSync('src/domain/profiles/avatar.fixture.png').toString('base64')
    const image = await prepareLinkMedia('IMAGE', { base64, alt: '  Comunidade reunida  ' })
    expect(image.alt).toBe('Comunidade reunida')
    expect((await sharp(image.bytes).metadata()).format).toBe('webp')
  })
  it('supports a larger cover but keeps icon bounds', async () => {
    const base64 = (await sharp({ create: { width: 1400, height: 800, channels: 3, background: 'navy' } }).png().toBuffer()).toString('base64')
    await expect(prepareLinkMedia('IMAGE', { base64, alt: 'Encontro' })).resolves.toMatchObject({ alt: 'Encontro' })
    await expect(prepareLinkMedia('ICON', { base64 })).rejects.toThrow()
  })
  it('rejects multi-frame WebP and excessive cover dimensions', async () => {
    const animated = await sharp(Buffer.from([255,0,0,255,0,0,255,255]), { raw: { width: 1, height: 2, channels: 4, pageHeight: 1 } }).webp({ loop: 0, delay: [100,100] }).toBuffer()
    expect((await sharp(animated).metadata()).pages).toBe(2)
    const large = await sharp({create:{width:1601,height:1,channels:3,background:'navy'}}).png().toBuffer()
    for (const bytes of [animated,large]) await expect(prepareLinkMedia('IMAGE',{base64:bytes.toString('base64'),alt:'Foto'})).rejects.toThrow()
  })
  it('rejects remote URLs, SVG, GIF, oversized bytes, invalid alt and unknown fields', async () => {
    for (const base64 of ['https://example.com/a.png', Buffer.from('<svg/>').toString('base64'), 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'A'.repeat(1398108)]) {
      await expect(prepareLinkMedia('IMAGE', { base64, alt: 'Foto' })).rejects.toThrow()
    }
    expect(linkMediaBody('IMAGE').safeParse({ base64: 'abcd', alt: ' ' }).success).toBe(false)
    expect(linkMediaBody('ICON').safeParse({ base64: 'abcd', alt: 'Foto' }).success).toBe(false)
  })
})
