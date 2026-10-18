import {cleanup,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {SiteShell} from './site-shell'
const route=vi.hoisted(()=>({path:'/p/comunidade/canais/estado'}))
vi.mock('next/navigation',()=>({usePathname:()=>route.path}))
vi.mock('./site-navigation',()=>({SiteNavigation:()=> <nav aria-label="Menus do site"/>}))
vi.mock('@/components/domain/consent',()=>({CookieSettings:()=> <button>Gerenciar cookies</button>}))
afterEach(()=>cleanup())
it('F37-C06 recovery belongs to the full personal page while catalogue/search keep shared chrome',()=>{
 const view=render(<SiteShell><main><h1>Canal indisponível</h1></main></SiteShell>);expect(screen.queryByRole('banner')).toBeNull();expect(screen.queryByRole('contentinfo')).toBeNull();expect(screen.getByRole('heading',{name:'Canal indisponível'})).toBeTruthy();route.path='/busca';view.rerender(<SiteShell><main>Busca</main></SiteShell>);expect(screen.getByRole('banner')).toBeTruthy();expect(screen.getByRole('contentinfo')).toBeTruthy()
})
