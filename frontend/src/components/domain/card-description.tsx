'use client'

import { useEffect, useId, useRef, useState } from 'react'
import styles from './card-description.module.css'

export function CardDescription({ text, className }: { text: string; className?: string }) {
  const descriptionId = useId()
  const paragraph = useRef<HTMLParagraphElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [overflow, setOverflow] = useState(false)
  const [preview, setPreview] = useState(text)

  useEffect(() => {
    const element = paragraph.current
    if (!element || expanded) return
    const measure = () => {
      const probe = element.cloneNode(false) as HTMLParagraphElement
      probe.removeAttribute('id')
      probe.setAttribute('aria-hidden', 'true')
      Object.assign(probe.style, {
        position: 'absolute', visibility: 'hidden', pointerEvents: 'none',
        width: `${element.getBoundingClientRect().width}px`, display: 'block',
        height: 'auto', maxHeight: 'none', webkitLineClamp: 'unset', margin: '0',
      })
      element.parentElement?.appendChild(probe)
      try {
        const computed = getComputedStyle(element)
        const lineHeight = parseFloat(computed.lineHeight) || (parseFloat(computed.fontSize) || 16) * 1.55
        const maxHeight = lineHeight * 2 + 1
        probe.textContent = text
        if (probe.scrollHeight <= maxHeight) {
          setOverflow(false)
          setPreview(text)
          return
        }
        const toggle = document.createElement('button')
        toggle.type = 'button'
        toggle.className = styles.toggle
        toggle.textContent = 'Ver mais'
        toggle.tabIndex = -1
        const content = document.createTextNode('')
        probe.replaceChildren(content, toggle)
        const characters = Array.from(text)
        let start = 0
        let end = characters.length
        while (start < end) {
          const middle = Math.ceil((start + end) / 2)
          content.textContent = `${characters.slice(0, middle).join('').trimEnd()}… `
          if (probe.scrollHeight <= maxHeight) start = middle
          else end = middle - 1
        }
        setPreview(characters.slice(0, start).join('').trimEnd())
        setOverflow(true)
      } finally {
        probe.remove()
      }
    }
    measure()
    document.fonts?.addEventListener('loadingdone', measure)
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(element)
    return () => {
      observer?.disconnect()
      document.fonts?.removeEventListener('loadingdone', measure)
    }
  }, [text, expanded])

  if (!text) return null
  return (
    <p ref={paragraph} id={descriptionId} className={`${className ?? ''} ${expanded ? styles.expanded : styles.collapsed}`}>
      {expanded || !overflow ? text : `${preview}…`}{' '}
      {overflow || expanded ? (
        <button type="button" className={styles.toggle} aria-expanded={expanded} aria-controls={descriptionId} onClick={() => setExpanded((current) => !current)}>
          {expanded ? 'Ver menos' : 'Ver mais'}
        </button>
      ) : null}
    </p>
  )
}
