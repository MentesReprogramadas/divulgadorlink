import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from './button'

describe('Button', () => {
  it('renderiza o botão do sistema', () => {
    render(<Button variant="primary">Acessar</Button>)
    expect(screen.getByRole('button', { name: 'Acessar' })).toBeTruthy()
  })
})
