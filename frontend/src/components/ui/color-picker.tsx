'use client'
import { useEffect, useId, useState } from 'react'
import type { CSSProperties } from 'react'
import styles from './color-picker.module.css'
import { LiquidLens } from './liquid-lens'
import { Input } from './input'

const palette = ['#f5f0e8', '#ffffff', '#151515', '#173c32', '#d9efb6', '#ece5ff', '#523b85', '#123b63', '#d5edff', '#ffddc8', '#803a35', '#e35339']
type ColorPickerProps = { label: string; value: string; onChange: (value: string, editing?: boolean) => void }
/** Local visual control: no native color dialog and no arbitrary CSS values. */
export function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  const id = useId(), [text, setText] = useState(value), [invalid, setInvalid] = useState(false)
  useEffect(() => { setText(value); setInvalid(false) }, [value])
  const color = /^#[0-9a-f]{6}$/i.test(value) ? value : '#ffffff'
  const channels = [1, 3, 5].map(start => parseInt(color.slice(start, start + 2), 16))
  function choose(next: string, editing = false) { setText(next); setInvalid(false); if(editing) onChange(next, true); else onChange(next) }
  return <div className={styles.picker}><LiquidLens radius={14}/><details><summary><span className={styles.swatch} style={{ background: color }} /><span>{label}</span><code>{color.toUpperCase()}</code><span aria-hidden="true">⌄</span></summary>
    <div className={styles.content}><div className={styles.palette} role="group" aria-label={'Paleta: ' + label}>{palette.map(hex => <button key={hex} type="button" aria-label={label + ': ' + hex} aria-pressed={color.toLowerCase() === hex} style={{ background: hex }} onClick={() => choose(hex)} />)}</div>
      <label htmlFor={id}>Código da cor</label><Input id={id} aria-label={label + ' — código hexadecimal'} value={text === value || invalid ? text : color} maxLength={7} spellCheck={false} aria-invalid={invalid || undefined} aria-describedby={invalid ? id + '-error' : undefined} onChange={event => { const next = event.target.value; setText(next); if (/^#[0-9a-f]{6}$/i.test(next)) { setInvalid(false); onChange(next, true) } else setInvalid(true) }} />
      {invalid ? <small id={id + '-error'} role="alert">Use # e seis letras de A a F ou números. Ex.: #173C32.</small> : null}
      {['Vermelho', 'Verde', 'Azul'].map((name, index) => <label className={styles.channel} key={name}>{name}<input type="range" min={0} max={255} aria-label={label + ' — ' + name} value={channels[index]} style={{ '--channel': ['#ff0000', '#00a000', '#0000ff'][index] } as CSSProperties} onChange={event => { const next = [...channels]; next[index] = Number(event.target.value); choose('#' + next.map(n => n.toString(16).padStart(2, '0')).join(''), true) }} /><output>{channels[index]}</output></label>)}
    </div>
  </details></div>
}
