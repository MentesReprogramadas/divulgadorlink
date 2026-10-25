'use client'
import { useEffect, useRef, useState } from 'react'

const vertexSource = 'attribute vec2 position; void main(){gl_Position=vec4(position,0.,1.);}'
const fragmentSource = `precision mediump float;
uniform vec2 resolution; uniform float time;
void main(){
  vec2 uv=gl_FragCoord.xy/resolution;
  float fold=sin(uv.x*10.+sin(uv.y*5.+time*.22)*1.4+time*.15);
  float ridge=pow(.5+.5*fold,8.);
  float ribbon=exp(-abs(uv.y-.5-.18*sin(uv.x*5.+time*.18))*12.);
  vec3 base=mix(vec3(.025,.07,.16),vec3(.025,.26,.32),uv.x);
  vec3 color=base+vec3(.08,.33,.3)*ridge*(.3+.7*ribbon)+vec3(.08,.18,.2)*ribbon;
  gl_FragColor=vec4(color,1.);
}`

export function WaveCanvas({ paused, className }: { paused: boolean; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const elapsed = useRef(0)
  const [generation, setGeneration] = useState(0)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    let context: WebGLRenderingContext | null = null
    try { context = canvas.getContext('webgl', { alpha: true, antialias: false, powerPreference: 'low-power' }) } catch { return }
    if (!context || typeof ResizeObserver === 'undefined' || typeof IntersectionObserver === 'undefined') return
    const gl = context
    function compile(type: number, source: string) {
      const shader = gl.createShader(type)
      if (!shader) return null
      gl.shaderSource(shader, source); gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { gl.deleteShader(shader); return null }
      return shader
    }
    const vertex = compile(gl.VERTEX_SHADER, vertexSource), fragment = compile(gl.FRAGMENT_SHADER, fragmentSource)
    const program = gl.createProgram(), buffer = gl.createBuffer()
    if (!vertex || !fragment || !program || !buffer) { gl.deleteShader(vertex); gl.deleteShader(fragment); gl.deleteProgram(program); gl.deleteBuffer(buffer); return }
    gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { gl.deleteShader(vertex); gl.deleteShader(fragment); gl.deleteProgram(program); gl.deleteBuffer(buffer); return }
    gl.useProgram(program); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'position')
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    const resolution = gl.getUniformLocation(program, 'resolution'), time = gl.getUniformLocation(program, 'time')
    let frame = 0, previous = 0, rendered = 0, visible = true
    function paint() {
      if (gl.isContextLost()) return
      gl.uniform2f(resolution, canvas!.width, canvas!.height); gl.uniform1f(time, reduced.matches ? 0 : elapsed.current); gl.drawArrays(gl.TRIANGLES, 0, 6)
      if (canvas!.dataset.renderer !== 'webgl') canvas!.dataset.renderer = 'webgl'
    }
    function draw(now: number) {
      frame = 0
      if (rendered && now - rendered < 1000 / 30 && !paused && !reduced.matches) { frame = requestAnimationFrame(draw); return }
      rendered = now
      if (previous && !paused && !reduced.matches) elapsed.current += Math.min(now - previous, 50) / 1000
      previous = now
      paint()
      if (!paused && !reduced.matches && visible && !document.hidden && !gl.isContextLost()) frame = requestAnimationFrame(draw)
    }
    function sync() { cancelAnimationFrame(frame); previous = 0; if (visible && !document.hidden && !gl.isContextLost()) frame = requestAnimationFrame(draw) }
    function resize() {
      if (gl.isContextLost()) return
      const box = canvas!.getBoundingClientRect()
      const scale = Math.min(window.devicePixelRatio || 1, 1.25)
      const width = Math.max(1, Math.round(box.width * scale)), height = Math.max(1, Math.round(box.height * scale))
      if (canvas!.width !== width) canvas!.width = width
      if (canvas!.height !== height) canvas!.height = height
      // Resizing clears the buffer; repaint before a delayed mobile animation frame.
      gl.viewport(0, 0, width, height); paint(); sync()
    }
    function lost(event: Event) { event.preventDefault(); cancelAnimationFrame(frame); delete canvas!.dataset.renderer }
    function restored() { setGeneration(value => value + 1) }
    const observer = new ResizeObserver(resize), intersection = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync() })
    observer.observe(canvas); intersection.observe(canvas); reduced.addEventListener('change', sync); document.addEventListener('visibilitychange', sync)
    canvas.addEventListener('webglcontextlost', lost); canvas.addEventListener('webglcontextrestored', restored); resize()
    return () => { cancelAnimationFrame(frame); observer.disconnect(); intersection.disconnect(); reduced.removeEventListener('change', sync); document.removeEventListener('visibilitychange', sync); canvas.removeEventListener('webglcontextlost', lost); canvas.removeEventListener('webglcontextrestored', restored); gl.deleteBuffer(buffer); gl.deleteProgram(program); gl.deleteShader(vertex); gl.deleteShader(fragment); delete canvas.dataset.renderer }
  }, [paused, generation])
  return <canvas ref={ref} className={className} aria-hidden="true" />
}

