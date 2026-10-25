import {act,cleanup,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {AreaFrame} from './area-frame'
import type {Session} from '@/domain/session'
const state=vi.hoisted(()=>({path:'/painel/perfil/previa',cached:null as Session|null,accessReady:false,session:vi.fn()}))
vi.mock('next/navigation',()=>({usePathname:()=>state.path}))
vi.mock('@/domain/session',()=>({readSession:()=>state.cached,SESSION_EVENT:'catalogo-session'}))
vi.mock('@/lib/api',()=>({currentSession:state.session,api:vi.fn(),bindApiWorkspace:vi.fn()}))
vi.mock('@/features/workspace-team/workspace-access',async importOriginal=>({...await importOriginal<typeof import('@/features/workspace-team/workspace-access')>(),useWorkspaceAccess:()=>({ready:state.accessReady,context:null,error:''})}))
vi.mock('@/components/forms/login-form',()=>({LoginForm:()=> <form aria-label="Autenticação"/>}))
const active:Session={role:'USER',status:'ACTIVE',canSubmit:true}
afterEach(()=>{cleanup();vi.resetAllMocks();state.path='/painel/perfil/previa';state.cached=null;state.accessReady=false})
for(const path of ['/painel/perfil/previa','/painel/equipe/shared/previa'])it(`mantém o skeleton pessoal durante sessão e acesso pendentes em ${path}`,async()=>{
 state.path=path
 let resolve!:(session:Session)=>void
 state.session.mockReturnValue(new Promise<Session>(done=>{resolve=done}))
 const view=render(<AreaFrame title="Painel"><h1>Página da pessoa</h1></AreaFrame>)
 expect(screen.getByRole('status',{name:'Carregando sua prévia'})).toBeTruthy()
 expect(view.container.querySelector('aside')).toBeNull()
 await act(async()=>resolve(active))
 expect(screen.getByRole('status',{name:'Carregando sua prévia'})).toBeTruthy()
 expect(view.container.querySelector('aside')).toBeNull()
 expect(screen.queryByRole('heading',{name:'Página da pessoa'})).toBeNull()
 state.accessReady=true
 view.rerender(<AreaFrame title="Painel"><h1>Página da pessoa</h1></AreaFrame>)
 expect(screen.getByRole('heading',{name:'Página da pessoa'})).toBeTruthy()
})
it('sessão já conhecida também aguarda acesso sem exibir a estrutura do painel',async()=>{
 state.cached=active;state.session.mockResolvedValue(active)
 const view=render(<AreaFrame title="Painel"><h1>Página da pessoa</h1></AreaFrame>)
 await act(async()=>{})
 expect(screen.getByRole('status',{name:'Carregando sua prévia'})).toBeTruthy()
 expect(view.container.querySelector('aside')).toBeNull()
})
it('sessão irrecuperável mostra autenticação sem revelar a página privada',async()=>{
 state.session.mockResolvedValue(null)
 render(<AreaFrame title="Painel"><h1>Página privada</h1></AreaFrame>)
 expect(await screen.findByRole('form',{name:'Autenticação'})).toBeTruthy()
 expect(screen.queryByRole('heading',{name:'Página privada'})).toBeNull()
})
