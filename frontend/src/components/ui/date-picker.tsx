'use client'

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Popover } from '@base-ui/react/popover'
import { ActionIcon } from './action-icon'
import styles from './date-picker.module.css'

export type DatePickerProps = {
  id?: string; name?: string; value?: string; defaultValue?: string
  onChange?: (event: { target: { value: string } }) => void
  withTime?: boolean; required?: boolean; disabled?: boolean; invalid?: boolean; className?: string
  'aria-label'?: string; 'aria-describedby'?: string
}
const pad = (n: number) => String(n).padStart(2, '0')
const iso = (date: Date) => `${String(date.getFullYear()).padStart(4, '0')}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
function dateOf(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number)
  const date = new Date(0); date.setHours(12, 0, 0, 0); date.setFullYear(year, month - 1, day)
  return date
}
function display(value: string) {
  if (!value) return ''
  const [date, time] = value.split('T')
  return date.split('-').reverse().join('/') + (time ? ` ${time.slice(0, 5)}` : '')
}
function parse(text: string, withTime: boolean) {
  const match = text.match(withTime ? /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/ : /^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return ''
  const [, day, month, year, hour, minute] = match
  const value = `${year}-${month}-${day}`
  if (+year < 1 || !Number.isFinite(dateOf(value).getTime()) || iso(dateOf(value)) !== value || (withTime && (+hour > 23 || +minute > 59))) return ''
  return value + (withTime ? `T${hour}:${minute}` : '')
}
function shiftMonth(date: Date, amount: number) {
  const next = new Date(date); next.setDate(1); next.setMonth(next.getMonth() + amount)
  next.setDate(Math.min(date.getDate(), new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()))
  return next
}
const weekdays = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']

export function DatePicker({ value, defaultValue = '', onChange, withTime = false, required, disabled, invalid, className, id, ...aria }: DatePickerProps) {
  const generatedId = useId(), inputId = id ?? generatedId
  const [local, setLocal] = useState(defaultValue)
  const current = value ?? local
  const [draft, setDraft] = useState(display(current))
  const [open, setOpen] = useState(false)
  const [focusDay, setFocusDay] = useState(() => current ? dateOf(current) : new Date())
  const [container, setContainer] = useState<HTMLElement | null>(null)
  const input = useRef<HTMLInputElement>(null), activeDay = useRef<HTMLButtonElement>(null)
  const emitted = useRef(current)
  const format = withTime ? 'dd/mm/aaaa hh:mm' : 'dd/mm/aaaa'
  useEffect(() => { if (current !== emitted.current) { setDraft(display(current)); emitted.current = current } }, [current])
  useEffect(() => { input.current?.setCustomValidity(draft && !parse(draft, withTime) ? `Use uma data válida no formato ${format}.` : '') }, [draft, format, withTime])
  useEffect(() => {
    const form = input.current?.form
    function reset() { if (value === undefined) { setLocal(defaultValue); setDraft(display(defaultValue)) } }
    form?.addEventListener('reset', reset)
    return () => form?.removeEventListener('reset', reset)
  }, [defaultValue, value])
  function change(next: string) { emitted.current = next; if (value === undefined) setLocal(next); onChange?.({ target: { value: next } }) }
  function commit(next: string) {
    const field = input.current
    if (!field) return
    // Notify the surrounding Field through the same input event used by typing.
    // This also clears a previous native validation error after calendar selection.
    field.setCustomValidity('')
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(field, display(next))
    field.dispatchEvent(new Event('input', { bubbles: true }))
  }
  function select(date: Date) {
    const next = iso(date) + (withTime ? `T${current.split('T')[1] ?? '00:00'}` : '')
    commit(next); setOpen(false)
  }
  function move(date: Date) {
    if (date.getFullYear() < 1 || date.getFullYear() > 9999) return
    setFocusDay(date)
    requestAnimationFrame(() => activeDay.current?.focus())
  }
  function navigate(event: KeyboardEvent<HTMLButtonElement>, day: Date) {
    const delta: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -day.getDay(), End: 6 - day.getDay() }
    if (event.key in delta) { event.preventDefault(); const next = new Date(day); next.setDate(next.getDate() + delta[event.key]); move(next) }
    if (event.key === 'PageUp' || event.key === 'PageDown') { event.preventDefault(); move(shiftMonth(day, (event.key === 'PageUp' ? -1 : 1) * (event.shiftKey ? 12 : 1))) }
  }
  const first = new Date(focusDay); first.setDate(1)
  const last = new Date(first); last.setMonth(last.getMonth() + 1); last.setDate(0)
  const count = last.getDate()
  const month = focusDay.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return <div className={styles.control}>
    <input type="hidden" name={aria.name} value={current} disabled={disabled} />
    <Popover.Root open={open} onOpenChange={next => { setOpen(next); if (next) { setFocusDay(current ? dateOf(current) : new Date()); setContainer(input.current?.closest('dialog') ?? null) } }}>
      <div className={styles.field}>
        <input {...aria} name={undefined} ref={input} id={inputId} type="text" className={['field', styles.input, className].filter(Boolean).join(' ')} value={draft} placeholder={format} required={required} disabled={disabled} aria-invalid={invalid || undefined} autoComplete="off" maxLength={withTime ? 16 : 10}
          onChange={event => { const text = event.target.value; setDraft(text); change(parse(text, withTime)) }} />
        <Popover.Trigger className={styles.trigger} disabled={disabled} aria-label="Abrir calendário" aria-describedby={inputId} title="Abrir calendário"><ActionIcon name="calendar" /></Popover.Trigger>
      </div>
      <Popover.Portal container={container ?? undefined}><Popover.Positioner sideOffset={6} align="end" collisionPadding={8} className={styles.positioner}>
        <Popover.Popup className={styles.popup} aria-label="Escolher data" initialFocus={activeDay}>
          <header className={styles.header}><button type="button" aria-label="Mês anterior" onClick={() => move(shiftMonth(focusDay, -1))}>‹</button><Popover.Title className={styles.title} aria-live="polite">{month}</Popover.Title><button type="button" aria-label="Próximo mês" onClick={() => move(shiftMonth(focusDay, 1))}>›</button></header>
          <table role="grid" aria-label={month} className={styles.calendar}><thead><tr>{weekdays.map(day => <th key={day} scope="col" abbr={day}>{day.slice(0, 3)}</th>)}</tr></thead><tbody>
            {Array.from({ length: Math.ceil((first.getDay() + count) / 7) }, (_, week) => <tr key={week}>{Array.from({ length: 7 }, (_, weekday) => {
              const number = week * 7 + weekday - first.getDay() + 1
              if (number < 1 || number > count) return <td key={weekday} />
              const day = new Date(focusDay); day.setDate(number)
              const selected = iso(day) === current.slice(0, 10), today = iso(day) === iso(new Date())
              return <td key={weekday} aria-selected={selected}><button type="button" ref={number === focusDay.getDate() ? activeDay : undefined} tabIndex={number === focusDay.getDate() ? 0 : -1} aria-label={day.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })} aria-current={today ? 'date' : undefined} data-selected={selected || undefined} onKeyDown={event => navigate(event, day)} onClick={() => select(day)}>{number}</button></td>
            })}</tr>)}
          </tbody></table>
          <p className={styles.help}>Use as setas para navegar entre os dias.</p>
          <footer className={styles.footer}><button type="button" onClick={() => select(new Date())}>Hoje</button><button type="button" onClick={() => { commit(''); setOpen(false) }}>Limpar</button><Popover.Close className={styles.close}>Fechar</Popover.Close></footer>
        </Popover.Popup>
      </Popover.Positioner></Popover.Portal>
    </Popover.Root>
  </div>
}
