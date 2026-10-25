import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SuspendedAccount } from './panel'
import { SiteNavigation } from '@/components/layout/site-navigation'

vi.mock('@/lib/api', () => ({ api: vi.fn(async()=>({status:403,body:{message:'Conta suspensa'}})),bindApiWorkspace:vi.fn() }))
vi.mock('next/navigation', () => ({ usePathname: () => '/painel', useRouter:()=>({push:vi.fn()}) }))

afterEach(cleanup)

describe('conta suspensa', () => {
  it('mostra o motivo e não abre o painel', () => {
    render(<><SiteNavigation role="USER" /><SuspendedAccount reason="golpe" /></>)
    expect(screen.getByRole('heading', { name: 'Conta suspensa' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Motivo' })).toBeTruthy()
    expect(screen.getByText('golpe')).toBeTruthy()
    expect(screen.queryByRole('navigation', { name: 'Áreas do painel' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Sair' })).toBeTruthy()
    expect(screen.getByRole('main').querySelector('button')).toBeNull()
  })

  it('trava mesmo sem motivo gravado', () => {
    render(<SuspendedAccount />)
    expect(screen.getByRole('heading', { name: 'Conta suspensa' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Motivo' })).toBeNull()
  })
})
