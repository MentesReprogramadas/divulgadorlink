import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BackButton } from './back-button'

const navigation = vi.hoisted(() => ({ back: vi.fn(), push: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => navigation }))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('BackButton', () => {
  it('volta pelo histórico quando veio de uma página do site', () => {
    vi.spyOn(document, 'referrer', 'get').mockReturnValue(`${window.location.origin}/busca?q=jogos`)
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(2)
    render(<BackButton />)
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(navigation.back).toHaveBeenCalledOnce()
    expect(navigation.push).not.toHaveBeenCalled()
  })

  it.each(['', 'https://outro-site.example/catalogo'])('usa a home no acesso direto ou externo: %s', (referrer) => {
    vi.spyOn(document, 'referrer', 'get').mockReturnValue(referrer)
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(2)
    render(<BackButton />)
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(navigation.push).toHaveBeenCalledWith('/')
    expect(navigation.back).not.toHaveBeenCalled()
  })

  it('usa a home quando não existe uma entrada anterior', () => {
    vi.spyOn(document, 'referrer', 'get').mockReturnValue(`${window.location.origin}/`)
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(1)
    render(<BackButton />)
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(navigation.push).toHaveBeenCalledWith('/')
    expect(screen.getByRole('button', { name: 'Voltar' }).getAttribute('type')).toBe('button')
  })
})
