import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
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
  it('mostra o rascunho com o mesmo card sem criar uma saída ou ação de navegação', () => {
    const { container } = render(<LinkRow preview id="draft" name="Minha comunidade" description="Uma comunidade para conversar" placement="organic" imageUrl="data:image/webp;base64,ZGVtbw==" showImpressions={false} />)
    expect(screen.getByRole('heading', { name: 'Minha comunidade' })).toBeTruthy()
    expect(container.querySelector('article > a')).toBeNull()
    expect(container.querySelector('article')?.hasAttribute('data-preview')).toBe(true)
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.queryByLabelText(/impress/)).toBeNull()
  })

  it('omite a região de foto ausente e remove uma imagem que falhou', () => {
    const { container, rerender } = render(<LinkRow {...row} placement="organic" />)
    expect(container.querySelector('article > img')).toBeNull()
    rerender(<LinkRow {...row} placement="organic" imageUrl="/api/v1/links/receitas/media/cover" imageAlt="Bolo de cenoura" />)
    const image = screen.getByRole('img', { name: 'Bolo de cenoura' })
    expect(image.getAttribute('src')).toBe('/bff/v1/links/receitas/media/cover')
    expect(image.parentElement?.tagName).toBe('ARTICLE')
    expect(image.closest('a')).toBeNull()
    fireEvent.error(image)
    expect(container.querySelector('article > img')).toBeNull()
  })

  it('mantém favorito independente do link com mídia e surfaceToken', () => {
    const favorite = vi.fn()
    render(<LinkRow {...row} placement="sponsored" imageUrl="/api/v1/links/receitas/media/cover" iconUrl="/api/v1/links/receitas/media/icon" cornerAction={<button onClick={favorite}>Favoritar</button>} />)
    const button = screen.getByRole('button', { name: 'Favoritar' })
    expect(button.closest('a')).toBeNull()
    expect(screen.getByRole('link', { name: 'Receitas' }).parentElement?.tagName).toBe('ARTICLE')
    expect(button.parentElement?.parentElement?.tagName).toBe('ARTICLE')
    fireEvent.click(button)
    expect(favorite).toHaveBeenCalledOnce()
    expect(screen.getByRole('link', { name: 'Receitas' }).getAttribute('href')).toBe(row.href)
    expect(screen.getByText('Patrocinado')).toBeTruthy()
  })

  it.each(['organic', 'sponsored'] as const)('indica a navegação sem criar outro controle: %s', (placement) => {
    render(<LinkRow {...row} placement={placement} />)
    const action = screen.getByText('Conhecer')
    expect(action.getAttribute('aria-hidden')).toBe('true')
    expect(action.closest('a, button')).toBeNull()
    expect(action.querySelector('svg')).not.toBeNull()
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'Receitas' }).getAttribute('href')).toBe(row.href)
    expect(screen.queryByRole('button', { name: /Conhecer/ })).toBeNull()
  })

  it('expõe só o nome no link e mostra nicho e rede fora dele', () => {
    render(<LinkRow {...row} placement="organic" />)
    const link = screen.getByRole('link', { name: 'Receitas' })
    expect(link.getAttribute('href')).toBe(row.href)
    expect(link.textContent).toBe('Receitas')
    expect(screen.getByTitle('Receitas').textContent).toBe('Receitas')
    expect(screen.getByText('Bolo de cenoura').closest('a')).toBeNull()
    expect(screen.getByText('Culinária').closest('a')).toBeNull()
    expect(screen.getByText('Telegram').closest('a')).toBeNull()
    expect(screen.getAllByRole('link')).toHaveLength(1)
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
    expect(kicker?.querySelector('.impression-mark')).toBeNull()
    expect(screen.getByLabelText('1.240 impressões').parentElement).toBe(screen.getByText('Conhecer').parentElement)
    expect(kicker?.querySelector('.ad-mark svg')?.getAttribute('viewBox')).toBe('0 0 16 16')
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
