'use client'

import { Children, Fragment, isValidElement, useRef, useState, type ReactNode } from 'react'
import { Select as BaseSelect } from '@base-ui/react/select'
import styles from './select.module.css'

type Option = { value: string; label: string; disabled: boolean; group?: string }
export type SelectProps = {
  children: ReactNode; id?: string; name?: string; value?: string; defaultValue?: string
  required?: boolean; disabled?: boolean; autoFocus?: boolean; invalid?: boolean; className?: string; icon?: ReactNode
  'aria-label'?: string; 'aria-labelledby'?: string; 'aria-describedby'?: string
  onChange?: (event: { target: { value: string } }) => void
}
function text(node: ReactNode): string {
  return Children.toArray(node).map(child => isValidElement<{ children?: ReactNode }>(child) ? text(child.props.children) : String(child)).join('')
}
function optionsFrom(children: ReactNode): Option[] {
  return Children.toArray(children).flatMap(child => {
    if (!isValidElement<{ value?: string; disabled?: boolean; children?: ReactNode }>(child)) return []
    if (child.type === Fragment) return optionsFrom(child.props.children)
    if (child.type === 'optgroup' && isValidElement<{ label: string; children?: ReactNode }>(child)) return optionsFrom(child.props.children).map(option => ({ ...option, group: child.props.label }))
    if (child.type !== 'option') return []
    const label = text(child.props.children)
    return [{ value: String(child.props.value ?? label), label, disabled: !!child.props.disabled }]
  })
}

export function Select({ children, value, defaultValue, onChange, name, required, disabled, invalid, className, icon, ...triggerProps }: SelectProps) {
  const options = optionsFrom(children)
  const ref = useRef<HTMLDivElement>(null)
  const [container, setContainer] = useState<HTMLElement | null>(null)
  return <div ref={ref} className={styles.control} data-select-control>
    <BaseSelect.Root<string> value={value} defaultValue={defaultValue ?? options[0]?.value ?? null} items={options} name={name} required={required} disabled={disabled} modal={false}
      onOpenChange={() => setContainer(ref.current?.closest('dialog') ?? null)} onValueChange={next => onChange?.({ target: { value: next ?? '' } })}>
      <BaseSelect.Trigger {...triggerProps} className={[styles.trigger, className].filter(Boolean).join(' ')} aria-invalid={invalid || undefined}>
        {icon ? <span className={styles.leadingIcon} aria-hidden="true">{icon}</span> : null}
        <BaseSelect.Value className={styles.value}>{current => <span data-select-value={String(current ?? '')}>{options.find(option => option.value === current)?.label ?? 'Escolha uma opção'}</span>}</BaseSelect.Value><BaseSelect.Icon className={styles.chevron}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></BaseSelect.Icon>
      </BaseSelect.Trigger>
      <BaseSelect.Portal container={container ?? undefined}><BaseSelect.Positioner positionMethod={container ? 'fixed' : 'absolute'} sideOffset={6} alignItemWithTrigger={false} className={styles.positioner}>
        <BaseSelect.Popup className={styles.popup}><BaseSelect.List className={styles.list}>
          {Array.from(new Set(options.map(option => option.group ?? ''))).map(group => <BaseSelect.Group key={group}>{group ? <BaseSelect.GroupLabel className={styles.groupLabel}>{group}</BaseSelect.GroupLabel> : null}{options.filter(option => (option.group ?? '') === group).map(option => <BaseSelect.Item key={option.value} value={option.value} data-value={option.value} disabled={option.disabled} className={styles.option}>
            <BaseSelect.ItemText>{option.label}</BaseSelect.ItemText><BaseSelect.ItemIndicator className={styles.check}>✓</BaseSelect.ItemIndicator>
          </BaseSelect.Item>)}</BaseSelect.Group>)}
        </BaseSelect.List></BaseSelect.Popup>
      </BaseSelect.Positioner></BaseSelect.Portal>
    </BaseSelect.Root>
  </div>
}
