import { createElement } from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SiteVisits, visitPayload } from './site-visits'
import { api } from '@/lib/api'
import { usePathname } from 'next/navigation'

vi.mock('next/navigation', () => ({ usePathname: vi.fn() }))
vi.mock('@/lib/api', () => ({ api: vi.fn().mockResolvedValue({}) }))
afterEach(() => { cleanup(); vi.clearAllMocks(); sessionStorage.clear() })

describe('visita interna', () => {
  it('leva a campanha só na entrada da sessão', () => {
    expect(visitPayload('/divulgar', '?utm_source=meta&utm_medium=paid&utm_campaign=outubro', true)).toEqual({
      path: '/divulgar', entry: true, source: 'meta', medium: 'paid', campaign: 'outubro',
    })
    expect(visitPayload('/divulgar', '?utm_source=meta', false)).toEqual({ path: '/divulgar', entry: false })
  })
  it('não conta a home mockada e seus detalhes, preservando o catálogo público', () => {
    for (const pathname of ['/dev/home-preview', '/dev/home-preview/link/fora-do-roteiro', '/dev/homes', '/dev/homes/aurora']) {
      vi.mocked(usePathname).mockReturnValue(pathname)
      const view = render(createElement(SiteVisits)); view.unmount()
    }
    expect(api).not.toHaveBeenCalled()
    vi.mocked(usePathname).mockReturnValue('/')
    render(createElement(SiteVisits))
    expect(api).toHaveBeenCalledWith('/v1/analytics/visits', expect.objectContaining({ method: 'POST' }))
  })
})
