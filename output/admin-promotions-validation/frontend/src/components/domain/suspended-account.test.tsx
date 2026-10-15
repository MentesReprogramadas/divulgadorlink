import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SuspendedAccount } from './panel'

vi.mock('@/lib/api', () => ({ api: vi.fn() }))
vi.mock('next/navigation', () => ({ usePathname: () => '/painel' }))

afterEach(cleanup)

describe('conta suspensa', () => {
  it('mostra o motivo e não abre o painel', () => {
    render(<SuspendedAccount reason="golpe" />)
    expect(screen.getByRole('heading', { name: 'Conta suspensa' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Motivo' })).toBeTruthy()
    expect(screen.getByText('golpe')).toBeTruthy()
    expect(screen.queryByRole('navigation', { name: 'Áreas do painel' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Sair' })).toBeTruthy()
  })

  it('trava mesmo sem motivo gravado', () => {
    render(<SuspendedAccount />)
    expect(screen.getByRole('heading', { name: 'Conta suspensa' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Motivo' })).toBeNull()
  })
})
