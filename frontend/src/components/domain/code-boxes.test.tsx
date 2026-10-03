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
})
