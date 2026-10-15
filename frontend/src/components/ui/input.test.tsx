import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Field, Input, Select, TextArea } from './input'

afterEach(cleanup)

describe('campos acessíveis', () => {
  it('associa label e dica sem exigir ids do consumidor', () => {
    render(<Field label="URL" hint="Use https."><Input /></Field>)
    const input = screen.getByLabelText('URL')
    const description = input.getAttribute('aria-describedby')
    expect(description).toBeTruthy()
    expect(document.getElementById(description!)?.textContent).toBe('Use https.')
  })

  it('preserva o id e a descrição externa e anuncia erro no controle', () => {
    render(<><p id="external">Instrução adicional</p><Field label="Nome" error="Informe o nome"><Input id="custom-name" aria-describedby="external" /></Field></>)
    const input = screen.getByLabelText('Nome')
    expect(input.id).toBe('custom-name')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(input.getAttribute('aria-describedby')?.split(' ')).toEqual(['external', 'custom-name-description'])
    expect(screen.getByRole('alert').textContent).toBe('Informe o nome')
  })

  it('mantém ids únicos e labels em selects e textos longos', () => {
    render(<><Field label="Descrição"><TextArea /></Field><Field label="Rede"><Select><option>Site</option></Select></Field></>)
    const description = screen.getByLabelText('Descrição')
    const network = screen.getByLabelText('Rede')
    expect(description.id).not.toBe(network.id)
    expect(network.tagName).toBe('SELECT')
  })
})
