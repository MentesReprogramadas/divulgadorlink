import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CardDescription } from './card-description'
import { LinkMeta } from './link-meta'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('descrição do card', () => {
  it('não oferece expansão para uma descrição curta', () => {
    render(<CardDescription text="Descrição curta" />)
    expect(screen.getByText('Descrição curta')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('expande e recolhe somente quando o texto excede o espaço', () => {
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(120)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(60)
    render(<CardDescription text="Descrição longa" />)
    const toggle = screen.getByRole('button', { name: 'Ver mais' })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(toggle.closest('p')?.id).toBe(toggle.getAttribute('aria-controls'))
    fireEvent.click(toggle)
    expect(toggle.closest('p')?.textContent).toContain('Descrição longa')
    expect(screen.getByRole('button', { name: 'Ver menos' }).getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Ver menos' }))
    expect(screen.getByRole('button', { name: 'Ver mais' }).getAttribute('aria-expanded')).toBe('false')
  })

  it('não oferece expansão quando o texto cabe exatamente no limite', () => {
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(40)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(40)
    render(<CardDescription text="Descrição que cabe em duas linhas" />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})

it('mantém os badges informativos sem links próprios', () => {
  render(<LinkMeta niche={{ name: 'Jogos', slug: 'jogos' }} network={{ name: 'Discord', slug: 'discord' }} />)
  expect(screen.getByText('Jogos')).toBeTruthy()
  expect(screen.getByText('Discord')).toBeTruthy()
  expect(screen.queryByRole('link')).toBeNull()
})

it('shows declared discovery metadata on cards and omits empty values', () => {
  const { rerender } = render(<LinkMeta discovery={{ city: { name: 'São Paulo', state: 'SP' }, languageTag: 'pt', modality: 'ONLINE' }} />)
  expect(screen.getByText('São Paulo / SP')).toBeTruthy()
  expect(screen.getByText('português')).toBeTruthy()
  expect(screen.getByText('Online')).toBeTruthy()
  rerender(<LinkMeta discovery={{ city: null, languageTag: null, modality: null }} />)
  expect(screen.queryByText('Não informado')).toBeNull()
  expect(document.querySelector('.link-meta')).toBeNull()
})
