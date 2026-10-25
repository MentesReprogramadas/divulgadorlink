import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { Page, TestInfo } from '@playwright/test'
import { captureHorizontalRemainder } from '../../e2e/ondas-admin-visual-tools'

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 1 })
  vi.stubGlobal('scrollTo', vi.fn())
})
afterEach(() => { document.body.innerHTML = ''; vi.unstubAllGlobals(); vi.restoreAllMocks() })

function scrollRegion(width: number, total: number, left = 0, overflow = 'auto', content: 'table' | 'cards' = 'table') {
  const element = document.createElement('div')
  element.setAttribute('role', 'region')
  element.setAttribute('aria-label', 'Relatório de teste')
  element.style.overflowX = overflow
  element.innerHTML = content === 'table' ? '<table><tbody><tr><td>Valor</td></tr></tbody></table>' : '<article>Card1</article><article>Card2</article>'
  element.scrollLeft = left
  Object.defineProperties(element, { clientWidth: { value: width }, scrollWidth: { value: total } })
  element.getBoundingClientRect = () => ({ width, height: 250, top: 100, bottom: 350, left: 0, right: width, x: 0, y: 100, toJSON: () => ({}) })
  element.scrollIntoView = vi.fn()
  document.body.append(element)
  return { element, locator: { evaluate: vi.fn(async (callback: (element: HTMLElement, argument: unknown) => unknown, argument: unknown) => callback(element, argument)) } }
}

function pageFor(regions: ReturnType<typeof scrollRegion>[]) {
  const collection = { count: async () => regions.length, nth: (index: number) => regions[index].locator }
  return {
    getByRole: vi.fn(() => ({ filter: () => collection })),
    locator: vi.fn(() => collection),
    evaluate: vi.fn(async (callback: (argument: unknown) => unknown, argument: unknown) => callback(argument)),
  } as unknown as Page
}

it('registra todas as colunas com sobreposição, origem e posição explícitas, restaurando a rolagem', async () => {
  const region = scrollRegion(200, 600, 25)
  const capture = vi.fn().mockResolvedValue('capture.png')
  const page = pageFor([region])
  await captureHorizontalRemainder(page, {} as TestInfo, '/admin/visao', 'office-table', { source: 'presentation-fixture', capture })
  const states = capture.mock.calls.map(call => call[2])
  expect(states.map(state => state.horizontalStage.left)).toEqual([0, 160, 320, 400])
  expect(states[3]).toMatchObject({ route: '/admin/visao', source: 'presentation-fixture', fullPage: true, horizontal: false, accessibility: false, horizontalStage: { region: 1, label: 'Relatório de teste', index: 4, clientWidth: 200, scrollWidth: 600 } })
  expect(new Set(states.map(state => state.state)).size).toBe(4)
  expect(region.element.scrollLeft).toBe(25)
  expect(scrollTo).toHaveBeenCalledOnce()
})

it('ignora regiões sem rolagem e restaura a posição original mesmo quando a captura falha', async () => {
  const fitting = scrollRegion(200, 200)
  const clipped = scrollRegion(200, 600, 0, 'hidden')
  const scrolling = scrollRegion(200, 600, 35)
  const capture = vi.fn().mockRejectedValue(new Error('captura indisponível'))
  await expect(captureHorizontalRemainder(pageFor([fitting, clipped, scrolling]), {} as TestInfo, '/admin/visao', 'office-table', { capture })).rejects.toThrow('captura indisponível')
  expect(capture).toHaveBeenCalledOnce()
  expect(fitting.element.scrollIntoView).not.toHaveBeenCalled()
  expect(clipped.element.scrollIntoView).not.toHaveBeenCalled()
  expect(scrolling.element.scrollLeft).toBe(35)
  expect(scrollTo).toHaveBeenCalledOnce()
})

it('revela o carrossel compacto na viewport e mantém o trilho e a página na posição original', async () => {
  const rail = scrollRegion(300, 900, 45, 'auto', 'cards')
  const capture = vi.fn().mockResolvedValue('capture.png')
  await captureHorizontalRemainder(pageFor([rail]), {} as TestInfo, '/dev/homes/cinema', 'reference-cinema', { source: 'reference', capture })
  const states = capture.mock.calls.map(call => call[2])
  expect(states.map(state => state.horizontalStage.left)).toEqual([0, 240, 480, 600])
  expect(states.every(state => state.fullPage === false && state.source === 'reference')).toBe(true)
  expect(rail.element.scrollIntoView).toHaveBeenCalledWith({ block: 'center', inline: 'nearest', behavior: 'instant' })
  expect(rail.element.scrollLeft).toBe(45)
  expect(scrollTo).toHaveBeenCalledOnce()
})
