import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HomeMore } from './home-more'
import { renderToStaticMarkup } from 'react-dom/server'

afterEach(cleanup)

describe('carregar mais links da home', () => {
  it('reserva a navegação HTML para navegadores sem JavaScript', () => {
    const { container } = render(<HomeMore cursor="abc" href="/?languageTag=pt&cursor=abc" onLoad={() => undefined} />)
    expect(container.querySelector('a')).toBeNull()
    expect(renderToStaticMarkup(<HomeMore cursor="abc" href="/?languageTag=pt&cursor=abc" onLoad={() => undefined} />)).toContain('<noscript><a href="/?languageTag=pt&amp;cursor=abc" rel="next">Mostrar mais</a></noscript>')
    expect(screen.queryByText('Abrir próxima página')).toBeNull()
  })
  it('esconde o controle sem cursor', () => {
    render(<HomeMore cursor={null} onLoad={() => undefined} />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('executa a ação sem navegar para outra página', () => {
    const onLoad = vi.fn()
    render(<HomeMore cursor="abc" onLoad={onLoad} />)
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar mais' }))
    expect(onLoad).toHaveBeenCalledOnce()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('bloqueia cliques durante o carregamento', () => {
    const onLoad = vi.fn()
    render(<HomeMore cursor="abc" loading onLoad={onLoad} />)
    const button = screen.getByRole('button', { name: 'Carregando links…' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    fireEvent.click(button)
    expect(onLoad).not.toHaveBeenCalled()
  })
})
