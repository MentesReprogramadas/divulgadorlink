import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { WaveCanvas } from './wave-canvas'

const gl = {
  VERTEX_SHADER: 1, FRAGMENT_SHADER: 2, COMPILE_STATUS: 3, LINK_STATUS: 4, ARRAY_BUFFER: 5, STATIC_DRAW: 6, FLOAT: 7, TRIANGLES: 8,
  createShader: vi.fn(() => ({})), shaderSource: vi.fn(), compileShader: vi.fn(), getShaderParameter: vi.fn(() => true), deleteShader: vi.fn(),
  createProgram: vi.fn(() => ({})), createBuffer: vi.fn(() => ({})), attachShader: vi.fn(), linkProgram: vi.fn(), getProgramParameter: vi.fn(() => true),
  deleteProgram: vi.fn(), deleteBuffer: vi.fn(), useProgram: vi.fn(), bindBuffer: vi.fn(), bufferData: vi.fn(),
  getAttribLocation: vi.fn(() => 0), enableVertexAttribArray: vi.fn(), vertexAttribPointer: vi.fn(), getUniformLocation: vi.fn(() => ({})),
  uniform2f: vi.fn(), uniform1f: vi.fn(), drawArrays: vi.fn(), viewport: vi.fn(), isContextLost: vi.fn(() => false),
}
let resize: () => void
let box: { width: number; height: number }

beforeEach(() => {
  vi.clearAllMocks()
  gl.isContextLost.mockReturnValue(false)
  box = { width: 390, height: 844 }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(gl as unknown as WebGLRenderingContext)
  vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockImplementation(() => box as DOMRect)
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as MediaQueryList)
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: ResizeObserverCallback) { resize = () => callback([], this as unknown as ResizeObserver) }
    observe() {} disconnect() {}
  })
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} })
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

it('paints initial and resized buffers before animation frames and avoids clearing unchanged dimensions', () => {
  const { container } = render(<WaveCanvas paused={false} />)
  const canvas = container.querySelector('canvas')!
  expect(gl.drawArrays).toHaveBeenCalledOnce()
  expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith('webgl', expect.objectContaining({ alpha: true }))
  const width = vi.spyOn(canvas, 'width', 'set'), height = vi.spyOn(canvas, 'height', 'set')
  act(resize)
  expect(width).not.toHaveBeenCalled(); expect(height).not.toHaveBeenCalled()
  box = { width: 390, height: 900 }
  act(resize)
  expect(width).not.toHaveBeenCalled(); expect(height).toHaveBeenCalledOnce()
  expect(gl.drawArrays).toHaveBeenCalledTimes(3)
})

it('exposes the CSS fallback on context loss and rebuilds resources when the context returns', () => {
  const { container } = render(<WaveCanvas paused={false} />)
  const canvas = container.querySelector('canvas')!
  gl.isContextLost.mockReturnValue(true)
  const lost = new Event('webglcontextlost', { cancelable: true })
  act(() => { canvas.dispatchEvent(lost) })
  expect(lost.defaultPrevented).toBe(true)
  expect(canvas.dataset.renderer).toBeUndefined()
  gl.isContextLost.mockReturnValue(false)
  act(() => { canvas.dispatchEvent(new Event('webglcontextrestored')) })
  expect(gl.createProgram).toHaveBeenCalledTimes(2)
  expect(canvas.dataset.renderer).toBe('webgl')
})

it('keeps the CSS fallback when WebGL cannot be created', () => {
  vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(null)
  const { container } = render(<WaveCanvas paused={false} />)
  expect(container.querySelector('canvas')!.dataset.renderer).toBeUndefined()
  expect(gl.drawArrays).not.toHaveBeenCalled()
})
