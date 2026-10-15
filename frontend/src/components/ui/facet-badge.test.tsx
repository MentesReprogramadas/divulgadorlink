import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { FacetBadge, TitleMark } from './facet-badge'

afterEach(cleanup)

describe('símbolos das redes', () => {
  it('usa o asset de marca local sem criar um link adicional', () => {
    render(<FacetBadge kind="network" slug="whatsapp" name="WhatsApp" />)
    const badge = screen.getByText('WhatsApp').parentElement!
    expect(badge.querySelector('img')?.getAttribute('src')).toBe('/networks/whatsapp.svg')
    expect(badge.querySelector('img')?.getAttribute('alt')).toBe('')
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('usa o mesmo símbolo no título da rede e mantém a escala', () => {
    const { container } = render(<TitleMark kind="network" slug="discord" />)
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/networks/discord.svg')
    expect(container.querySelector('img')?.getAttribute('width')).toBe('28')
  })

  it('mantém ícones genéricos para site e os ícones semânticos de nicho', () => {
    const { container } = render(<><FacetBadge kind="network" slug="site" name="Site" /><FacetBadge kind="niche" slug="jogos" name="Jogos" /></>)
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/niches/jogos.svg')
    expect(container.querySelector('img')?.getAttribute('width')).toBe('18')
    expect(container.querySelectorAll('svg')).toHaveLength(1)
  })
})
