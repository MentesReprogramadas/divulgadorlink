import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Consent } from './consent'

afterEach(() => {
  cleanup()
  document.cookie = 'tla_consent=; Path=/; Max-Age=0'
})

describe('aviso de cookies', () => {
  it('reabre a escolha por Gerenciar cookies', async () => {
    document.cookie = 'tla_consent=denied; Path=/'
    render(<Consent pending={false} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Gerenciar cookies' }))
    expect(screen.getByRole('heading', { name: 'Este site usa cookies' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Recusar' })).toBeTruthy()
  })
})
