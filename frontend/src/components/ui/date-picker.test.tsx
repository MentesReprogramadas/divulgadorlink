import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useState } from 'react'
import { Field } from './input'
import { DatePicker } from './date-picker'

afterEach(cleanup)
describe('DatePicker', () => {
  it('preserva limites ISO inclusivos, required e mudanças externas dos limites', () => {
    const view = render(<form aria-label="Filtro"><Field label="Data"><DatePicker name="from" required min="2026-10-10" max="2026-10-20" /></Field></form>)
    const input = screen.getByLabelText('Data') as HTMLInputElement
    expect(input.checkValidity()).toBe(false)
    fireEvent.change(input, { target: { value: '09/10/2026' } })
    expect(input.checkValidity()).toBe(false)
    expect(input.validationMessage).toContain('10/10/2026')
    fireEvent.change(input, { target: { value: '10/10/2026' } })
    expect(input.checkValidity()).toBe(true)
    fireEvent.change(input, { target: { value: '20/10/2026' } })
    expect(input.checkValidity()).toBe(true)
    expect(new FormData(screen.getByRole('form') as HTMLFormElement).get('from')).toBe('2026-10-20')
    view.rerender(<form aria-label="Filtro"><Field label="Data"><DatePicker name="from" required min="2026-10-10" max="2026-10-18" /></Field></form>)
    expect(input.checkValidity()).toBe(false)
    expect(input.validationMessage).toContain('18/10/2026')
  })
  it('calendário desabilita dias fora do intervalo e mantém o foco no limite pelo teclado', async () => {
    render(<Field label="Data"><DatePicker defaultValue="2026-10-10" min="2026-10-10" max="2026-10-20" /></Field>)
    fireEvent.click(screen.getByRole('button', { name: 'Abrir calendário' }))
    const first = await screen.findByRole('button', { name: '10 de outubro de 2026' }) as HTMLButtonElement
    expect((screen.getByRole('button', { name: '9 de outubro de 2026' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: '21 de outubro de 2026' }) as HTMLButtonElement).disabled).toBe(true)
    first.focus(); fireEvent.keyDown(first, { key: 'ArrowLeft' })
    await waitFor(() => expect(document.activeElement).toBe(first))
    fireEvent.click(screen.getByRole('button', { name: '20 de outubro de 2026' }))
    expect((screen.getByLabelText('Data') as HTMLInputElement).value).toBe('20/10/2026')
  })
  it('limites com horário local conservam minutos e não convertem fuso', () => {
    render(<form aria-label="Filtro"><Field label="Fim"><DatePicker name="end" withTime min="2026-10-17T14:30" max="2026-10-17T16:00" /></Field></form>)
    const input = screen.getByLabelText('Fim') as HTMLInputElement
    for (const [text, valid] of [['17/10/2026 14:29', false], ['17/10/2026 14:30', true], ['17/10/2026 16:00', true], ['17/10/2026 16:01', false]] as const) {
      fireEvent.change(input, { target: { value: text } })
      expect(input.checkValidity(), text).toBe(valid)
    }
    expect(new FormData(screen.getByRole('form') as HTMLFormElement).get('end')).toBe('2026-10-17T16:01')
  })
  it('valida dias reais e envia ISO sem converter fuso horário', () => {
    render(<form aria-label="Filtro"><Field label="Data"><DatePicker name="from" required /></Field></form>)
    const input = screen.getByLabelText('Data') as HTMLInputElement
    fireEvent.change(input, { target: { value: '29/02/2025' } })
    expect(input.checkValidity()).toBe(false)
    fireEvent.change(input, { target: { value: '29/02/2024' } })
    expect(input.checkValidity()).toBe(true)
    expect(new FormData(screen.getByRole('form') as HTMLFormElement).get('from')).toBe('2024-02-29')
  })
  it('preserva digitação parcial controlada e sincroniza alteração externa', () => {
    function Example() { const [value, setValue] = useState('2026-10-17'); return <><Field label="Data"><DatePicker value={value} onChange={e => setValue(e.target.value)} /></Field><button onClick={() => setValue('2027-01-02')}>Atualizar</button></> }
    render(<Example />)
    const input = screen.getByLabelText('Data') as HTMLInputElement
    fireEvent.change(input, { target: { value: '18/' } })
    expect(input.value).toBe('18/')
    fireEvent.click(screen.getByText('Atualizar'))
    expect(input.value).toBe('02/01/2027')
  })
  it('preserva horário local, rejeita hora inválida e restaura formulário', () => {
    render(<form aria-label="Filtro"><Field label="Fim"><DatePicker name="end" withTime defaultValue="2026-10-17T14:30" /></Field></form>)
    const input = screen.getByLabelText('Fim') as HTMLInputElement, form = screen.getByRole('form') as HTMLFormElement
    fireEvent.change(input, { target: { value: '18/10/2026 25:00' } })
    expect(input.checkValidity()).toBe(false)
    fireEvent.change(input, { target: { value: '18/10/2026 23:59' } })
    expect(new FormData(form).get('end')).toBe('2026-10-18T23:59')
    fireEvent.reset(form)
    expect(input.value).toBe('17/10/2026 14:30')
  })
  it('navega em ano bissexto por teclado e seleciona o dia focado', async () => {
    render(<Field label="Data"><DatePicker defaultValue="2024-01-31" /></Field>)
    fireEvent.click(screen.getByRole('button', { name: 'Abrir calendário' }))
    const day = await screen.findByRole('button', { name: '31 de janeiro de 2024' })
    fireEvent.keyDown(day, { key: 'PageDown' })
    const leap = await screen.findByRole('button', { name: '29 de fevereiro de 2024' })
    await waitFor(() => expect(document.activeElement).toBe(leap))
    fireEvent.click(leap)
    expect((screen.getByLabelText('Data') as HTMLInputElement).value).toBe('29/02/2024')
  })
  it('remove o erro do Field quando o calendário corrige uma data inválida', async () => {
    render(<Field label="Data"><DatePicker /></Field>)
    const input = screen.getByLabelText('Data') as HTMLInputElement
    fireEvent.change(input, { target: { value: '31/02/2026' } }); fireEvent.blur(input)
    expect(screen.getByRole('alert')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Abrir calendário' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Hoje' }))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    expect(input.checkValidity()).toBe(true)
  })
})
