import { describe, expect, it } from 'vitest'
import { createDisplacementTexture } from './liquid-optics'

describe('liquid edge optics', () => {
  it('keeps the centre and clipped corners neutral while bending opposite edges in opposite directions', () => {
    const map = createDisplacementTexture(180, 100, 20)
    const pixel = (x: number, y: number) => [...map.pixels.slice((y * map.width + x) * 4, (y * map.width + x) * 4 + 4)]
    expect(pixel(90, 50)).toEqual([128, 128, 128, 255])
    expect(pixel(0, 0)).toEqual([128, 128, 128, 255])
    expect(pixel(3, 50)[0]).toBeGreaterThan(128)
    expect(pixel(176, 50)[0]).toBeLessThan(128)
    expect(pixel(90, 3)[1]).toBeGreaterThan(128)
    expect(pixel(90, 96)[1]).toBeLessThan(128)
    expect(pixel(3, 50)[0] + pixel(176, 50)[0]).toBe(256)
  })
  it('bounds texture work and handles a capsule and tiny control without invalid bytes', () => {
    for (const dimensions of [[1920, 1080, 22], [42, 42, 999], [1, 1, 0]] as const) {
      const map = createDisplacementTexture(dimensions[0], dimensions[1], dimensions[2])
      expect(Math.max(map.width, map.height)).toBeLessThanOrEqual(320)
      expect(map.pixels).toHaveLength(map.width * map.height * 4)
      expect(map.pixels.every(Number.isFinite)).toBe(true)
    }
  })
  it('rejects invalid geometry before allocation', () => {
    for (const dimensions of [[0, 1, 1], [NaN, 10, 1], [10, Infinity, 1], [10, 10, -1]] as const) expect(() => createDisplacementTexture(dimensions[0], dimensions[1], dimensions[2])).toThrow(RangeError)
  })
})
