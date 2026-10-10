import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Consent } from './consent'

afterEach(() => {
  cleanup()
  document.cookie = 'tla_consent=; Path=/; Max-Age=0'
})

describe('aviso de cookies', () => {
  it('reabre a escolha só quando a privacidade pede', async () => {
    document.cookie = 'tla_consent=denied; Path=/'
    render(<Consent pending={false} />)
    expect(screen.queryByRole('button', { name: 'Gerenciar cookies' })).toBeNull()
    fireEvent(window, new Event('tla-cookie-review'))
    expect(await screen.findByRole('heading', { name: 'Este site usa cookies' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Recusar' })).toBeTruthy()
  })
})
