import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { iconPaths } from '@/components/ui/action-icon'
import { WorkspaceNavigation } from '@/features/account/components/workspace-navigation'
import { navigationIcons } from './navigation-icons'

vi.mock('@/features/workspace-team/workspace-access',async original=>({...await original<typeof import('@/features/workspace-team/workspace-access')>(),useWorkspaceAccess:()=>({ready:true,context:{ownerId:null,grants:null},error:''})}))
const route=vi.hoisted(()=>({path:'/painel'}))
vi.mock('next/navigation', () => ({ usePathname: () => route.path, useRouter:()=>({push:vi.fn()}) }))
afterEach(()=>{cleanup();route.path='/painel'})

describe('significado exclusivo dos ícones', () => {
  it('não atribui o mesmo desenho a destinos diferentes, inclusive entre áreas', () => {
    const drawings = Object.values(navigationIcons).map(name => iconPaths[name])
    expect(new Set(drawings).size).toBe(drawings.length)
  })

  it.each(['/painel','/painel/perfil','/painel/clientes','/admin/visao'])('distingue grupos e destinos na sidebar %s renderizada', path => {
    route.path=path;const area=path.startsWith('/admin')?'admin':'panel'
    const { container } = render(<WorkspaceNavigation area={area} />)
    // Section disclosures repeat the expand action; destination symbols stay exclusive.
    const symbols = Array.from(container.querySelectorAll('a, summary:not([data-navigation-section])')).map(item => ({
      label: item.textContent,
      drawing: item.querySelector('svg path')?.getAttribute('d'),
    }))
    expect(symbols.every(symbol => symbol.drawing)).toBe(true)
    for (const symbol of symbols) {
      expect(symbols.filter(other => other.drawing === symbol.drawing).map(other => other.label)).toEqual([symbol.label])
    }
  })

  it('distingue os pares de conceitos que já causaram colisões', () => {
    for (const [first, second] of [
      ['permanentLink','invite'], ['permanentLink','teamAccess'], ['pageEditing','edit'], ['pagePromotion','promotion'], ['star', 'promotion'], ['copy', 'external'], ['pix', 'payment'],
      ['orders', 'plans'], ['bell', 'clock'], ['availability', 'clock'],
      ['shield', 'report'], ['account', 'settings'], ['appearance', 'settings'], ['clearSearch', 'close'], ['clearSearch', 'resetFilters'],
      ['close', 'resetFilters'], ['close', 'reject'], ['close', 'disable'],
      ['up', 'moveUp'], ['down', 'moveDown'], ['down', 'loadMore'], ['eye', 'preview'],
    ] as const) expect(iconPaths[first]).not.toBe(iconPaths[second])
  })
})
