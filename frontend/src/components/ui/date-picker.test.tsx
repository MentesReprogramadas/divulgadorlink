import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useState } from 'react'
import { Field } from './input'
import { DatePicker } from './date-picker'

afterEach(cleanup)
describe('DatePicker', () => {
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
