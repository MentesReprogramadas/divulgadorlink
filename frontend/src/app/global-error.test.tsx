import { cleanup, fireEvent, render, within } from '@testing-library/react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, expect, it, vi } from 'vitest'
import GlobalError from './global-error'
import { GlobalErrorContent } from './global-error-content'

afterEach(cleanup)

it('oferece a composição autônoma sem aninhar documentos na prévia', () => {
  const container = document.createElement('div')
  container.innerHTML = renderToStaticMarkup(<GlobalErrorContent />)
  const page = within(container)
  expect(page.getByRole('main').getAttribute('aria-labelledby')).toBe(page.getByRole('heading', { level: 1 }).id)
  expect(page.getByRole('button', { name: 'Tentar de novo' }).getAttribute('type')).toBe('button')
  expect(page.getByRole('link', { name: 'Voltar ao catálogo' }).getAttribute('href')).toBe('/')
  expect(container.querySelector('html, head, body')).toBeNull()
  expect(container.querySelectorAll('svg:not([aria-hidden="true"])')).toHaveLength(0)
})

it('recarrega o documento após falha do layout e mantém mensagem pública segura', () => {
  const reset = vi.fn()
  const reload = vi.fn()
  render(createElement(GlobalError, { error: Object.assign(new Error('segredo-interno'), { digest: 'digest-privado' }), reset }), { container: document })
  const page = within(document.documentElement)
  expect(document.documentElement.lang).toBe('pt-BR')
  expect(document.title).toBe('Falha ao carregar | Tem Link Aqui')
  expect(document.querySelectorAll('html > body')).toHaveLength(1)
  expect(page.getByRole('heading', { level: 1 }).textContent).toBe('Não foi possível abrir esta página')
  expect(page.getByRole('alert').textContent).toContain('Tente novamente')
  expect(page.queryByText(/segredo-interno|digest-privado/)).toBeNull()
  expect(page.getByRole('link', { name: 'Voltar ao catálogo' }).getAttribute('href')).toBe('/')
  vi.stubGlobal('window', new Proxy(window, { get: (target, key) => key === 'location' ? { reload } : Reflect.get(target, key, target) }))
  try {
    fireEvent.click(page.getByRole('button', { name: 'Tentar de novo' }))
    expect(reload).toHaveBeenCalledOnce()
    expect(reset).not.toHaveBeenCalled()
  } finally { vi.unstubAllGlobals() }
})
