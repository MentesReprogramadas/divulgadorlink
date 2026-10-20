import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ColorPicker } from './color-picker'
afterEach(cleanup)
it('uses palette, hex and keyboard sliders without a native color input', () => {
  const change = vi.fn()
  const { container } = render(<ColorPicker label="Fundo" value="#ffffff" onChange={change} />)
  fireEvent.click(screen.getByText('Fundo'))
  expect(container.querySelector('input[type="color"]')).toBeNull()
  fireEvent.change(screen.getByLabelText('Fundo — código hexadecimal'), { target: { value: 'url(x)' } })
  expect(change).not.toHaveBeenCalled(); expect(screen.getByRole('alert')).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Fundo — código hexadecimal'), { target: { value: '#173c32' } })
  expect(change).toHaveBeenCalledWith('#173c32', true)
  fireEvent.change(screen.getByRole('slider', { name: 'Fundo — Vermelho' }), { target: { value: '0' } })
  expect(change).toHaveBeenCalledWith('#00ffff', true)
})
it('reconciles incomplete text when a theme changes the external value', () => {
  const { rerender } = render(<ColorPicker label="Fundo" value="#ffffff" onChange={() => {}} />)
  fireEvent.click(screen.getByText('Fundo'))
  fireEvent.change(screen.getByLabelText('Fundo — código hexadecimal'), { target: { value: '#a' } })
  rerender(<ColorPicker label="Fundo" value="#173c32" onChange={() => {}} />)
  expect((screen.getByLabelText('Fundo — código hexadecimal') as HTMLInputElement).value).toBe('#173c32')
  expect(screen.queryByRole('alert')).toBeNull()
})
