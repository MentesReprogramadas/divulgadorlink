import { afterEach, expect, it, vi } from 'vitest'
import { readCatalogHistory, saveCatalogHistory } from './catalog-history'

afterEach(() => { vi.restoreAllMocks(); window.history.replaceState(null, '', '/') })

it.each([null, {}, { path: '/', pages: -1, scrollY: 0 }, { path: '/', pages: 51, scrollY: 0 }, { path: '/', pages: 1.5, scrollY: 0 }, { path: '/', pages: 1, scrollY: -1 }, { path: '/', pages: 1, scrollY: Infinity }, { path: '/outra', pages: 1, scrollY: 0 }])('ignora contexto inválido ou de outra entrada: %j', value => {
  window.history.replaceState({ tlaCatalog: value }, '', '/')
  expect(readCatalogHistory('/')).toBeNull()
})

it('preserva o estado do navegador sem gravar conteúdo e suporta histórico bloqueado', () => {
  window.history.replaceState({ __NA: true }, '', '/')
  saveCatalogHistory('/', 2, 200)
  expect(window.history.state).toEqual({ __NA: true, tlaCatalog: { path: '/', pages: 2, scrollY: 200 } })
  expect(readCatalogHistory('/')).toEqual({ path: '/', pages: 2, scrollY: 200 })
  saveCatalogHistory('/outra', 5, 1)
  expect(window.history.state.tlaCatalog.pages).toBe(2)
  const write = vi.spyOn(window.history, 'replaceState').mockImplementation(() => { throw new DOMException('blocked') })
  expect(() => saveCatalogHistory('/', 1, 0)).not.toThrow()
  write.mockRestore()
})
