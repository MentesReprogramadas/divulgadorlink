import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ResponsiveTabs } from './responsive-tabs'
import styles from './responsive-tabs.module.css'

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

it('mantém abas que cabem na barra quando as ações precisam de outra linha', () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) { return this.classList.contains(styles.toolbar) ? 600 : 0 })
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function (this: HTMLElement) { return this.getAttribute('role') === 'tablist' ? 500 : 0 })
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) { return new DOMRect(0, 0, this.classList.contains(styles.actions) ? 180 : 0, 48) })
  render(<ResponsiveTabs value="data" onChange={() => undefined} label="Seção" idPrefix="sections" items={[{ id: 'data', label: 'Dados', icon: 'account' }, { id: 'links', label: 'Links', icon: 'link' }]} actions={<button type="button">Publicar alterações</button>} />)
  expect(screen.getByRole('tablist', { name: 'Seção em abas' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Publicar alterações' })).toBeTruthy()
  expect(screen.queryByRole('combobox', { name: 'Seção' })).toBeNull()
})

it('mantém o seletor em telas estreitas quando as próprias abas ultrapassam a barra', () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) { return this.classList.contains(styles.toolbar) ? 320 : 0 })
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function (this: HTMLElement) { return this.getAttribute('role') === 'tablist' ? 500 : 0 })
  render(<ResponsiveTabs value="data" onChange={() => undefined} label="Seção" idPrefix="sections" items={[{ id: 'data', label: 'Dados', icon: 'account' }, { id: 'links', label: 'Links', icon: 'link' }]} />)
  expect(screen.getByRole('combobox', { name: 'Seção' })).toBeTruthy()
  expect(screen.queryByRole('tablist')).toBeNull()
})
