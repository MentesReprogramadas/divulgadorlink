'use client'
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type KeyboardEvent } from 'react'

type Gesture = { id: string; pointerId: number; x: number; y: number; moved: boolean; target: string | null }

/** Pointer capture covers mouse, pen and touch. Only the handle disables touch scrolling. */
export function useProfileSort(ids: string[], onMove: (source: string, target: string) => void) {
  const root = useRef<HTMLUListElement>(null), gesture = useRef<Gesture | null>(null)
  const [dragging, setDragging] = useState<string | null>(null), [over, setOver] = useState<string | null>(null)
  const frame = useRef(0), pointerY = useRef(0)
  function stop() { cancelAnimationFrame(frame.current); gesture.current = null; setDragging(null); setOver(null) }
  useEffect(() => () => cancelAnimationFrame(frame.current), [])
  function targetAt(x: number, y: number) {
    const element = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-sort-id]')
    return element && root.current?.contains(element) ? element.dataset.sortId ?? null : null
  }
  function autoScroll() {
    const delta = pointerY.current < 80 ? -12 : pointerY.current > window.innerHeight - 80 ? 12 : 0
    if (delta) window.scrollBy(0, delta)
    if (gesture.current) frame.current = requestAnimationFrame(autoScroll)
  }
  return {
    root, dragging, over,
    handle(id: string) {
      return {
        onPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
          if (event.button !== 0 || !event.isPrimary) return
          event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId)
          gesture.current = { id, pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false, target: null }
        },
        onPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
          const current = gesture.current
          if (!current || current.pointerId !== event.pointerId) return
          if (!current.moved && Math.hypot(event.clientX - current.x, event.clientY - current.y) < 6) return
          event.preventDefault(); pointerY.current = event.clientY
          if (!current.moved) { current.moved = true; setDragging(id); frame.current = requestAnimationFrame(autoScroll) }
          current.target = targetAt(event.clientX, event.clientY); setOver(current.target)
        },
        onPointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
          const current = gesture.current
          if (!current || current.pointerId !== event.pointerId) return
          const target = targetAt(event.clientX, event.clientY)
          if (current.moved && target && target !== current.id) onMove(current.id, target)
          stop()
        },
        onPointerCancel: stop,
        onLostPointerCapture: stop,
        onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
          if (event.key === 'Escape') { stop(); return }
          const offset = ['ArrowUp', 'ArrowLeft'].includes(event.key) ? -1 : ['ArrowDown', 'ArrowRight'].includes(event.key) ? 1 : 0
          if (!offset) return
          event.preventDefault()
          const target = ids[ids.indexOf(id) + offset]
          if (target) onMove(id, target)
        },
      }
    },
  }
}
