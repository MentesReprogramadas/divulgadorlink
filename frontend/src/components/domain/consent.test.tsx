import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Consent, CookieSettings } from './consent'
import { renderToString } from 'react-dom/server'

vi.mock('next/navigation', () => ({ usePathname: () => '/' }))
vi.mock('@/lib/api', () => ({ api: vi.fn().mockResolvedValue({ status: 200, body: {} }) }))

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    disconnect() {}
  })
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => ({ enabled: false }) }))
})

afterEach(() => {
  cleanup()
  document.cookie = 'tla_consent=; Path=/; Max-Age=0'
  document.getElementById('google-ads-tag')?.remove()
  const host = window as Window & { dataLayer?: unknown[]; gtag?: unknown }
  delete host.dataLayer
  delete host.gtag
  vi.unstubAllGlobals()
})

describe('aviso de cookies', () => {
  it('mantém ações desabilitadas até ler os cookies no navegador', () => {
    expect((renderToString(<Consent pending />).match(/disabled=""/g) ?? []).length).toBe(2)
  })
  it('exibe uma região sem modal nem bloqueio de interação com a página', () => {
    render(<><a href="/busca">Buscar links</a><Consent pending /></>)
    const banner = screen.getByRole('region', { name: 'Este site usa cookies' })
    expect(banner.className).toBe('cookie-banner')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.getElementById('google-ads-tag')).toBeNull()
    screen.getByRole('link', { name: 'Buscar links' }).focus()
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Buscar links' }))
  })

  it.each([
    { button: 'Aceitar', value: 'marketing' },
    { button: 'Recusar', value: 'denied' },
  ])('some após $button e preserva a escolha ao montar novamente', ({ button, value }) => {
    const { unmount } = render(<Consent pending />)
    fireEvent.click(screen.getByRole('button', { name: button }))
    expect(screen.queryByRole('region', { name: 'Este site usa cookies' })).toBeNull()
    expect(document.cookie).toContain(`tla_consent=${value}`)
    expect(document.getElementById('google-ads-tag') !== null).toBe(value === 'marketing')
    unmount()
    render(<Consent pending={false} />)
    expect(screen.queryByRole('region', { name: 'Este site usa cookies' })).toBeNull()
  })

  it('reabre a escolha só quando a privacidade pede', async () => {
    document.cookie = 'tla_consent=denied; Path=/'
    render(<Consent pending={false} />)
    expect(screen.queryByRole('button', { name: 'Gerenciar cookies' })).toBeNull()
    fireEvent(window, new Event('tla-cookie-review'))
    expect(await screen.findByRole('heading', { name: 'Este site usa cookies' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Recusar' })).toBeTruthy()
  })

  it('gerenciar cookies reabre a faixa e uma nova confirmação a fecha', () => {
    document.cookie = 'tla_consent=denied; Path=/'
    render(<><CookieSettings /><Consent pending={false} /></>)
    expect(screen.queryByRole('region', { name: 'Este site usa cookies' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Gerenciar cookies' }))
    expect(screen.getByRole('region', { name: 'Este site usa cookies' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Recusar' }))
    expect(screen.queryByRole('region', { name: 'Este site usa cookies' })).toBeNull()
  })
})
