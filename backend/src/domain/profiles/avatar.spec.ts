import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { avatarPng } from './avatar'
const fixture = () => readFileSync('src/domain/profiles/avatar.fixture.png')
it('F09 mídia decodifica imagem real limitada e devolve PNG reencodado', () => { const png = avatarPng(fixture().toString('base64')); expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a'); expect(png.readUInt32BE(16)).toBe(2); expect(avatarPng(png.toString('base64'))).toEqual(png) })
it('F09 mídia recusa formato disfarçado, CRC inválido, arquivo truncado e excesso de bytes', () => {
  const corrupt = fixture(); corrupt[corrupt.length - 1] ^= 1
  for (const bytes of [Buffer.from('<svg onload="alert(1)"/>'), corrupt, fixture().subarray(0, 30), Buffer.concat([fixture(), Buffer.alloc(1)]), Buffer.alloc(262145)]) expect(() => avatarPng(bytes.toString('base64'))).toThrow()
})
