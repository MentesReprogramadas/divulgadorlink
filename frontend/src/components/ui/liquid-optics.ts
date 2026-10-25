export type DisplacementTexture = { width: number; height: number; pixels: Uint8ClampedArray }

// Rounded-rectangle edge normals encode a lens, rather than random turbulence.
export function createDisplacementTexture(width: number, height: number, radius: number): DisplacementTexture {
  if (![width, height, radius].every(Number.isFinite) || width <= 0 || height <= 0 || radius < 0) throw new RangeError('Invalid lens geometry')
  const ratio = Math.min(1, 320 / Math.max(width, height))
  const w = Math.max(2, Math.round(width * ratio)), h = Math.max(2, Math.round(height * ratio))
  const r = Math.min(radius * ratio, w / 2, h / 2)
  const bevel = Math.max(3, Math.min(22 * ratio, Math.min(w, h) * .27))
  const pixels = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const px = x + .5 - w / 2, py = y + .5 - h / 2
    const qx = Math.abs(px) - w / 2 + r, qy = Math.abs(py) - h / 2 + r
    const ox = Math.max(qx, 0), oy = Math.max(qy, 0), length = Math.hypot(ox, oy)
    const inside = r - length - Math.min(Math.max(qx, qy), 0)
    const nx = length ? ox / length * Math.sign(px) : qx >= qy ? Math.sign(px) : 0
    const ny = length ? oy / length * Math.sign(py) : qy > qx ? Math.sign(py) : 0
    const depth = Math.max(0, Math.min(1, inside / bevel))
    const bend = inside > 0 ? Math.pow(1 - depth, 2) * Math.min(1, inside / Math.max(.5, ratio)) : 0
    const offset = (y * w + x) * 4
    pixels[offset] = 128 - nx * bend * 120
    pixels[offset + 1] = 128 - ny * bend * 120
    pixels[offset + 2] = 128
    pixels[offset + 3] = 255
  }
  return { width: w, height: h, pixels }
}
