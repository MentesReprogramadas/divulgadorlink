'use client'

import { useEffect, useRef } from 'react'

const LENGTH = 6

export function CodeBoxes({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (next: string) => void
  disabled?: boolean
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([])
  const digits = Array.from({ length: LENGTH }, (_, index) => value[index] ?? '')

  useEffect(() => {
    refs.current[0]?.focus()
  }, [])

  function commit(next: string[]) {
    onChange(next.join('').replace(/\D/g, '').slice(0, LENGTH))
  }

  function apply(index: number, raw: string) {
    const chars = raw.replace(/\D/g, '')
    const next = [...digits]
    if (chars.length === 0) {
      next[index] = ''
      commit(next)
      return
    }
    const slice = chars.slice(0, LENGTH - index).split('')
    slice.forEach((char, offset) => {
      next[index + offset] = char
    })
    commit(next)
    const focusAt = Math.min(index + slice.length, LENGTH - 1)
    if (slice.length === 1 && index < LENGTH - 1) refs.current[index + 1]?.focus()
    else refs.current[focusAt]?.focus()
  }

  function onKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      event.preventDefault()
      const next = [...digits]
      next[index - 1] = ''
      commit(next)
      refs.current[index - 1]?.focus()
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault()
      refs.current[index - 1]?.focus()
    }
    if (event.key === 'ArrowRight' && index < LENGTH - 1) {
      event.preventDefault()
      refs.current[index + 1]?.focus()
    }
  }

  function onPaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const chars = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, LENGTH)
    if (!chars) return
    event.preventDefault()
    onChange(chars)
    refs.current[Math.min(chars.length, LENGTH) - 1]?.focus()
  }

  return (
    <div className="code-boxes" role="group" aria-label="Código do e-mail">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(node) => { refs.current[index] = node }}
          className={digit ? 'code-box is-filled' : 'code-box'}
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          aria-label={`Dígito ${index + 1} de 6`}
          maxLength={index === 0 ? LENGTH : 1}
          value={digit}
          disabled={disabled}
          onChange={(event) => apply(index, event.target.value)}
          onKeyDown={(event) => onKeyDown(index, event)}
          onPaste={onPaste}
          onFocus={(event) => event.currentTarget.select()}
        />
      ))}
    </div>
  )
}
