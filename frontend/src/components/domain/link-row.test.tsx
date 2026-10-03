import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { LinkRow } from './link-row'

afterEach(() => cleanup())

const row = {
  id: 'receitas',
  name: 'Receitas',
  description: 'Bolo de cenoura',
  href: '/link/receitas?surfaceToken=abc',
  niche: { name: 'Culinária', slug: 'culinaria' },
  network: { name: 'Telegram', slug: 'telegram' },
}

describe('LinkRow', () => {
  it('expõe só o nome no link e mostra nicho e rede fora dele', () => {
    render(<LinkRow {...row} placement="organic" />)
    const link = screen.getByRole('link', { name: 'Receitas' })
    expect(link.getAttribute('href')).toBe(row.href)
    expect(link.textContent).toBe('Receitas')
    expect(screen.getByText('Bolo de cenoura').closest('a')).toBeNull()
    expect(screen.getByRole('link', { name: 'Culinária' }).getAttribute('href')).toBe('/nicho/culinaria')
    expect(screen.getByRole('link', { name: 'Telegram' }).getAttribute('href')).toBe('/rede/telegram')
    expect(screen.queryByText('Patrocinado')).toBeNull()
    expect(screen.getByLabelText('0 impressões')).toBeTruthy()
  })

  it('marca patrocinado pelo placement e pelo indicador', () => {
    const { container } = render(<LinkRow {...row} placement="sponsored" impressions={1240} />)
    expect(screen.getByRole('link', { name: 'Receitas' }).textContent).toBe('Receitas')
    expect(screen.getByText('Patrocinado').closest('a')).toBeNull()
    expect(container.querySelector('[data-placement="sponsored"]')).not.toBeNull()
    expect(container.querySelector('[data-link-id="receitas"]')).not.toBeNull()
    expect(screen.getByLabelText('1.240 impressões')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Receitas' }).textContent).not.toContain('1.240')
    const kicker = container.querySelector('.sponsored-kicker')
    expect(kicker?.textContent).toContain('Patrocinado')
    expect(kicker?.querySelector('.impression-mark')).not.toBeNull()
  })

  it('esconde o olho quando a flag está desligada', () => {
    render(<LinkRow {...row} placement="sponsored" impressions={3} showImpressions={false} />)
    expect(screen.getByText('Patrocinado')).toBeTruthy()
    expect(screen.queryByLabelText(/impress/)).toBeNull()
    cleanup()
    render(<LinkRow {...row} placement="organic" showImpressions={false} />)
    expect(screen.queryByLabelText(/impress/)).toBeNull()
  })
})
