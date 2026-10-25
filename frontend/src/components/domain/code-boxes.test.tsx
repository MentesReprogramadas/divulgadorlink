import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { CodeBoxes } from './code-boxes'

afterEach(() => cleanup())

function Harness() {
  const [code, setCode] = useState('')
  return <CodeBoxes value={code} onChange={setCode} />
}

function digit(index: number): HTMLInputElement {
  return screen.getByLabelText(`Dígito ${index} de 6`) as HTMLInputElement
}

describe('CodeBoxes', () => {
  it('distribui um código de seis dígitos digitado no primeiro quadrado', () => {
    render(<Harness />)
    fireEvent.change(digit(1), { target: { value: '482913' } })
    expect(digit(1).value).toBe('4')
    expect(digit(6).value).toBe('3')
  })

  it('ignora letras e avança um dígito por vez', () => {
    render(<Harness />)
    fireEvent.change(digit(1), { target: { value: 'a7' } })
    expect(digit(1).value).toBe('7')
    expect(digit(2).value).toBe('')
  })

  it('preserva a navegação por teclado e o foco ao apagar o dígito anterior', () => {
    render(<Harness />)
    expect(document.activeElement).toBe(digit(1))
    fireEvent.change(digit(1), { target: { value: '4' } })
    expect(document.activeElement).toBe(digit(2))
    fireEvent.keyDown(digit(2), { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(digit(1))
    fireEvent.keyDown(digit(1), { key: 'ArrowRight' })
    expect(document.activeElement).toBe(digit(2))
    fireEvent.keyDown(digit(2), { key: 'Backspace' })
    expect(document.activeElement).toBe(digit(1))
    expect(digit(1).value).toBe('')
  })

  it('distribui o código colado e mantém os campos desativados quando solicitado', () => {
    const { rerender } = render(<Harness />)
    fireEvent.paste(digit(1), { clipboardData: { getData: () => '48 29-13' } })
    expect(Array.from({ length: 6 }, (_, index) => digit(index + 1).value).join('')).toBe('482913')
    expect(document.activeElement).toBe(digit(6))
    rerender(<CodeBoxes value="482913" onChange={() => undefined} disabled />)
    expect(screen.getAllByRole('textbox').every(input => (input as HTMLInputElement).disabled)).toBe(true)
  })
})
