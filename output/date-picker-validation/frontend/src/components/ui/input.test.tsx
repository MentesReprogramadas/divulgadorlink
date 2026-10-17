import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useState } from 'react'
import { Field, Input, Select, TextArea } from './input'

afterEach(cleanup)

describe('campos acessíveis', () => {
  it('preserva o valor digitado ao corrigir um campo controlado que estava vazio', () => {
    function ControlledField() { const [value, setValue] = useState(''); return <Field label="Título"><Input required value={value} onChange={event => setValue(event.target.value)} /></Field> }
    render(<ControlledField />)
    const input = screen.getByLabelText('Título') as HTMLInputElement
    fireEvent.invalid(input)
    expect(screen.getByRole('alert').textContent).toBe('Preencha este campo.')
    fireEvent.input(input, { target: { value: 'Receitas da Ana' } })
    expect(input.value).toBe('Receitas da Ana')
    fireEvent.blur(input)
    expect(screen.queryByRole('alert')).toBeNull()
  })
  it('indica obrigatoriedade sem mudar o nome acessível e valida antes de enviar', () => {
    render(<Field label="E-mail"><Input required type="email" /></Field>)
    const input = screen.getByLabelText('E-mail')
    expect(input.closest('.field-block')?.querySelector('[aria-hidden="true"]')?.textContent).toBe('*')
    fireEvent.blur(input)
    expect(screen.getByRole('alert').textContent).toBe('Preencha este campo.')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    fireEvent.change(input, { target: { value: 'incompleto' } }); fireEvent.blur(input)
    expect(screen.getByRole('alert').textContent).toBe('Digite um e-mail válido.')
    fireEvent.change(input, { target: { value: 'ana@example.com' } }); fireEvent.blur(input)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(input.getAttribute('aria-invalid')).toBeNull()
  })
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
    expect(network.getAttribute('role')).toBe('combobox')
  })
})
