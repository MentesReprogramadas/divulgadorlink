import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TrafficPanel } from './traffic-panel'

const api = vi.fn()
vi.mock('@/lib/api', () => ({ api: (...args: unknown[]) => api(...args) }))

afterEach(() => {
  cleanup()
  api.mockReset()
})

const traffic = {
  windowDays: 30,
  from: '2026-09-11',
  views: 40,
  entries: 10,
  daily: [{ day: '2026-10-09', views: 8, entries: 4 }],
  paths: [{ path: '/divulgar', views: 8, entries: 4 }],
  campaigns: [{ source: 'meta', medium: 'cpc', campaign: 'outubro', entries: 3 }],
  consent: { marketing: 6, denied: 4 },
  funnel: [
    { name: 'CompleteRegistration', count: 2 },
    { name: 'LinkPublished', count: 1 },
  ],
  consentedRegistrations: [{ source: 'meta', medium: 'cpc', campaign: 'outubro', registrations: 1 }],
}

describe('tráfego na gestão', () => {
  it('separa visão, funil, páginas e campanhas', async () => {
    api.mockResolvedValue({ status: 200, body: traffic })
    render(<TrafficPanel />)
    expect(await screen.findByText('Entradas')).toBeTruthy()
    expect(screen.queryByText('/divulgar')).toBeNull()
    expect(screen.queryByText('Cadastros')).toBeNull()

    fireEvent.click(screen.getByRole('tab', { name: 'Funil' }))
    expect(screen.getByText('Cadastros')).toBeTruthy()
    expect(screen.getByText('2 · 20%')).toBeTruthy()

    fireEvent.click(screen.getByRole('tab', { name: 'Páginas' }))
    expect(screen.getByText('/divulgar')).toBeTruthy()

    fireEvent.click(screen.getByRole('tab', { name: 'Campanhas' }))
    expect(screen.getByText('outubro')).toBeTruthy()
    expect(screen.getByText('3 entradas · 1 cadastros com aceite')).toBeTruthy()
  })
})
