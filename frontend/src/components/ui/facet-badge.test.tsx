import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { FacetBadge, TitleMark } from './facet-badge'

afterEach(cleanup)

describe('símbolos das redes', () => {
  it('usa o asset de marca local sem criar um link adicional', () => {
    render(<FacetBadge kind="network" slug="whatsapp" name="WhatsApp" />)
    const badge = screen.getByText('WhatsApp').parentElement!
    const logo = badge.querySelector('[aria-hidden="true"]') as HTMLElement
    expect(logo.style.maskImage).toContain('/networks/whatsapp.svg')
    expect(badge.querySelector('img')).toBeNull()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('usa o mesmo símbolo no título da rede e mantém a escala', () => {
    const { container } = render(<TitleMark kind="network" slug="discord" />)
    const logo = container.querySelector('[aria-hidden="true"]') as HTMLElement
    expect(logo.style.maskImage).toContain('/networks/discord.svg')
    expect(logo.style.width).toBe('28px')
  })

  it('mantém ícones genéricos para site e os ícones semânticos de nicho', () => {
    const { container } = render(<><FacetBadge kind="network" slug="site" name="Site" /><FacetBadge kind="niche" slug="jogos" name="Jogos" /></>)
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelectorAll('svg')).toHaveLength(2)
    expect(container.querySelectorAll('svg[style]')).toHaveLength(0)
  })
})
