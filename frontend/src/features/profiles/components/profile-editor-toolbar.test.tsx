import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {ProfileEditorToolbar} from './profile-editor-toolbar'

vi.mock('@/features/workspace-team/workspace-access',()=>({useWorkspaceAccess:()=>({context:null})}))
vi.mock('@/features/profile-billing/billing-access',()=>({useBillingAccess:()=>({state:null})}))
vi.mock('@/components/ui/responsive-tabs',()=>({ResponsiveTabs:()=> <div data-editor-tabs/>}))
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals()})
const props={section:'identity' as const,onSection:vi.fn(),pending:false,canSave:true,onAction:vi.fn(),onReload:vi.fn(),onUnpublish:vi.fn()}

it('acomoda todas as ferramentas no espaço visível e recalcula a posição ao redimensionar',async()=>{
 vi.stubGlobal('innerHeight',700)
 vi.stubGlobal('innerWidth',320)
 render(<ProfileEditorToolbar {...props}/>)
 const trigger=screen.getByLabelText('Mais opções da página'),menu=trigger.closest('details')!
 const contents=screen.getByRole('group',{name:'Ferramentas da página',hidden:true}),popup=contents.parentElement!
 vi.spyOn(popup,'getBoundingClientRect').mockReturnValue({top:0,bottom:560,height:560,left:12,right:300,width:288,x:12,y:0,toJSON(){}})
 Object.defineProperty(contents,'scrollHeight',{configurable:true,value:560})
 const rect=vi.spyOn(trigger,'getBoundingClientRect').mockReturnValue({top:600,bottom:644,height:44,left:300,right:344,width:44,x:300,y:600,toJSON(){}})
 menu.open=true;fireEvent(menu,new Event('toggle'))
 await waitFor(()=>expect(popup.dataset.side).toBe('top'))
 expect(popup.style.getPropertyValue('--profile-menu-height')).toBe('580px')
 rect.mockReturnValue({top:100,bottom:144,height:44,left:20,right:64,width:44,x:20,y:100,toJSON(){}})
 fireEvent(window,new Event('resize'))
 expect(popup.dataset.side).toBe('bottom')
 expect(popup.style.getPropertyValue('--profile-menu-height')).toBe('536px')
 expect(popup.style.getPropertyValue('--profile-menu-shift')).toBe('236px')
 expect(within(contents).getByRole('button',{name:'Checklist'})).toBeTruthy()
 expect(popup.querySelector(':scope > [data-optics]')).toBeTruthy()
 expect(contents.querySelector(':scope > [data-optics]')).toBeNull()
})

it('mantém ações e link publicados acessíveis, fecha ao executar e devolve foco no Escape',()=>{
 const onAction=vi.fn()
 render(<ProfileEditorToolbar {...props} publicPath="/p/minha-pagina" onAction={onAction}/>)
 const trigger=screen.getByLabelText('Mais opções da página'),menu=trigger.closest('details')!
 menu.open=true
 const history=screen.getByRole('button',{name:'Histórico'})
 history.focus();expect(document.activeElement).toBe(history)
 expect(screen.getByRole('link',{name:'Abrir minha página'}).getAttribute('href')).toBe('/p/minha-pagina')
 fireEvent.keyDown(history,{key:'Escape'})
 expect(menu.open).toBe(false);expect(document.activeElement).toBe(trigger)
 menu.open=true;fireEvent.click(screen.getByRole('button',{name:'Checklist'}))
 expect(onAction).toHaveBeenCalledWith('checklist');expect(menu.open).toBe(false)
})

it('não monta lentes na régua invisível de medidas e conserva os botões sem foco',()=>{
 const {container}=render(<ProfileEditorToolbar {...props}/>)
 const ruler=container.querySelector('[inert][aria-hidden="true"]')!
 expect(ruler.querySelectorAll('button')).toHaveLength(8)
 expect([...ruler.querySelectorAll('button')].every(button=>button.tabIndex===-1)).toBe(true)
 expect(ruler.querySelector('[data-optics]')).toBeNull()
})
