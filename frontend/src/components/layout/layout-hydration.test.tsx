import { startTransition, useEffect, type ReactNode } from 'react'
import type { Root } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import RootLayout from '@/app/layout'

// Next15 ships its own React canary; using npm React19.0 would exercise another reconciler.
vi.mock('react', () => vi.importActual<typeof import('react')>('next/dist/compiled/react'))
vi.mock('react/jsx-runtime', () => vi.importActual<typeof import('react/jsx-runtime')>('next/dist/compiled/react/jsx-runtime'))
vi.mock('react/jsx-dev-runtime', () => vi.importActual<typeof import('react/jsx-dev-runtime')>('next/dist/compiled/react/jsx-dev-runtime'))
const hydration = vi.hoisted(() => ({ release: undefined as (() => void) | undefined, path: '', search: '', profile: null as {restricted:boolean;appearance:{background:string}} | null }))
const catalog = vi.hoisted(() => vi.fn(async () => ({status:200,body:null})))
vi.mock('@/lib/catalog-page', () => ({loadCatalog:catalog}))
vi.mock('@/features/profiles/server/load-profile', () => ({loadPublicProfile:async()=>hydration.profile}))
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ host: 'checklist.localhost:3018', 'x-pathname':hydration.path, 'x-search':hydration.search }),
  cookies: async () => ({ get: (name: string) => name === 'tla_consent' ? { value: 'denied' } : undefined, has: () => false }),
}))
vi.mock('next/font/google', () => ({ Source_Sans_3: () => ({ variable: 'font-source-sans' }), Outfit: () => ({ variable: 'font-outfit' }) }))
vi.mock('next/navigation', () => ({ usePathname: () => '/admin/configuracoes', notFound: () => {throw new Error('NOT_FOUND')} }))
vi.mock('@/components/domain/consent', () => ({ Consent: () => null, CookieSettings: () => <button>Gerenciar cookies</button> }))
vi.mock('@/components/domain/site-visits', () => ({ SiteVisits: () => null }))
vi.mock('./site-navigation', () => ({ SiteNavigation: () => {
  if (hydration.release) queueMicrotask(hydration.release)
  return <nav aria-label="Menus do site" />
} }))
vi.mock('./ondas-atmosphere', () => ({ OndasAtmosphere: () => null }))
const { hydrateRoot } = await vi.importActual<typeof import('react-dom/client')>('next/dist/compiled/react-dom/client')
const { renderToString } = await vi.importActual<typeof import('react-dom/server')>('next/dist/compiled/react-dom/server')

let root: Root | undefined
afterEach(() => { root?.unmount(); root = undefined; hydration.release = undefined; hydration.path='';hydration.search='';hydration.profile=null;catalog.mockReset();catalog.mockResolvedValue({status:200,body:null});document.body.innerHTML = '' })

it('resolve a mesma consulta da coleção antes do shell e preserva filtros repetidos',async()=>{
 hydration.path='/descobrir/ofertas-telegram';hydration.search='?cursor=abc&languageTag=pt&languageTag=en&utm_source=teste'
 await RootLayout({children:<main>Ofertas</main>})
 expect(catalog).toHaveBeenCalledExactlyOnceWith('/api/v1/catalog-collections/ofertas-telegram?languageTag=pt&languageTag=en&cursor=abc')
 catalog.mockResolvedValue({status:404,body:null})
 await expect(RootLayout({children:<main/>})).rejects.toThrow('NOT_FOUND')
})

it('envia a cor publicada no primeiro HTML sem revelar tema de página restrita', async()=>{
 hydration.path='/p/ana';hydration.profile={restricted:false,appearance:{background:'#ece5ff'}}
 const html=renderToString(await RootLayout({children:<main>Perfil</main>}))
 expect(new DOMParser().parseFromString(html,'text/html').body.style.backgroundColor).toBe('rgb(236, 229, 255)')
 hydration.profile={restricted:true,appearance:{background:'#ece5ff'}}
 const restricted=renderToString(await RootLayout({children:<main>Confirme a idade</main>}))
 expect(new DOMParser().parseFromString(restricted,'text/html').body.style.backgroundColor).toBe('')
})

it('usa fundo pessoal neutro na prévia enquanto a sessão precisa ser recuperada', async()=>{
 hydration.path='/painel/perfil/previa'
 const html=renderToString(await RootLayout({children:<main>Prévia</main>}))
 expect(new DOMParser().parseFromString(html,'text/html').body.style.backgroundColor).toBe('rgb(245, 240, 232)')
})

it('renderiza carregamento em vidro no SSR enquanto o conteúdo da rota está pendente', async () => {
  const pending = new Promise<Awaited<ReactNode>>(() => undefined)
  const server = renderToString(await RootLayout({ children: pending }))
  const parsed = new DOMParser().parseFromString(server, 'text/html')
  const fallback = parsed.querySelector('main.panel-page[data-route-pending]')
  expect(fallback).not.toBeNull()
  expect(fallback?.getAttribute('aria-busy')).toBe('true')
  expect(fallback?.textContent).not.toContain('Carregando página')
  expect(fallback?.querySelector('[role="status"][aria-label="Carregando conteúdo"]')).not.toBeNull()
  expect(fallback?.querySelector('[data-skeleton-block]')).not.toBeNull()
  expect(fallback?.querySelector('[data-optics]')).not.toBeNull()
})

it.each(['', '/descobrir/ofertas-telegram'])('hidrata o RootLayout sem erro ou troca de DOM quando o conteúdo RSC resolve na primeira microtask: %s', async (pathname) => {
  hydration.path = pathname
  const errors: unknown[] = []
  let committed = false
  function Probe() { useEffect(() => { committed = true }, []); return null }
  const content = <main><h1>Área de gestão</h1><Probe /></main>
  const server = renderToString(await RootLayout({ children: content }))
  const parsed = new DOMParser().parseFromString(server, 'text/html')
  document.documentElement.replaceWith(document.importNode(parsed.documentElement, true))
  const originalMain = document.querySelector('main')
  const originalHost = document.getElementById('main-content')
  expect(originalMain).not.toBeNull()
  expect(originalHost).not.toBeNull()
  const pending = new Promise<Awaited<ReactNode>>(resolve => { hydration.release = () => resolve(content) })
  expect(Object.hasOwn(pending, 'status')).toBe(false)
  const client = await RootLayout({ children: pending })
  startTransition(() => { root = hydrateRoot(document, client, { onRecoverableError: error => errors.push(error) }) })
  await vi.waitFor(() => expect(committed).toBe(true), { interval: 1 })
  expect(errors).toEqual([])
  expect(document.querySelector('main')).toBe(originalMain)
  expect(document.getElementById('main-content')).toBe(originalHost)
  expect(document.querySelector('h1')?.textContent).toBe('Área de gestão')
})
