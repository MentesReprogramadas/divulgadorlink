import {afterEach,expect,it,vi} from 'vitest'
import {act,cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {chooseSelect} from '@/test-select'
import {api} from '@/lib/api'
import {LinkEditor,LinkList} from './panel-links'
import {InteractionPolicy} from '@/components/ui/interaction-policy'

vi.mock('@/lib/api',()=>({api:vi.fn()}))
afterEach(()=>{cleanup();vi.resetAllMocks()})
it('distinguishes loading, unavailable and recorded link metrics without losing the accessible labels',()=>{
 const links=[{id:'loading',name:'Aguardando contagem',status:'PUBLISHED'},{id:'missing',name:'Contagem indisponível no momento',status:'PUBLISHED'},{id:'ready',name:'Leitura em grupo',status:'PUBLISHED'}]
 render(<LinkList links={links} banned={false} stats={{loading:undefined,missing:null,ready:{impressions:1280,clicks:64,ctr:5}}}/>)
 expect(screen.getByRole('status',{name:'Contando métricas'}).textContent).toContain('ImpressõesCliquesTaxa de cliques')
 expect(screen.getByText('Contagem indisponível')).toBeTruthy()
 const ready=within(screen.getByRole('heading',{name:'Leitura em grupo'}).closest('article')!)
 for(const label of ['Impressões','Cliques','Taxa de cliques'])expect(ready.getByText(label)).toBeTruthy()
 for(const value of ['1.280','64','5%'])expect(ready.getByText(value)).toBeTruthy()
 expect(ready.getByRole('link',{name:'Ver resultado'}).getAttribute('href')).toBe('/painel/links/ready/resultado')
})
it('keeps text unsent when optional data fails and saves both through one action on retry',async()=>{
 let fail=true
 const patches:string[]=[]
 vi.mocked(api).mockImplementation(async(path,init)=>{
  if(String(path).includes('discovery-options'))return {status:200,body:{languages:[],cities:[],selectedCity:null}}
  if(init?.method==='PATCH'){
   patches.push(String(path))
   if(String(path).endsWith('/discovery')){
    if(fail)throw Error('offline')
    return {status:200,body:{metadata:{cityId:null,languageTag:null,modality:'ONLINE'},version:1}}
   }
   return {status:200,body:{applied:false}}
  }
  return {status:200,body:{metadata:{cityId:null,languageTag:null,modality:null},version:0}}
 })
 const user=userEvent.setup();render(<LinkEditor link={{id:'own',name:'Leitura',description:'Livros',status:'PUBLISHED'}} banned={false}/>)
 const save=screen.getByRole('button',{name:'Salvar alterações'})
 await waitFor(()=>expect((save as HTMLButtonElement).disabled).toBe(false))
 await user.type(screen.getByLabelText('Nova descrição'),' e conversas')
 await chooseSelect(screen.getByLabelText('Forma de participação (Opcional)'),'ONLINE')
 await user.click(save);await screen.findByRole('alert')
 expect(patches).toEqual(['/v1/links/own/discovery'])
 fail=false;await user.click(save);await screen.findByText('Proposta registrada')
 expect(patches).toEqual(['/v1/links/own/discovery','/v1/links/own/discovery','/v1/links/own'])
 expect((screen.getByLabelText('Nova descrição') as HTMLInputElement).value).toBe('Livros e conversas')
 expect(screen.queryByRole('dialog')).toBeNull()
})

it('allows editing text when optional metadata cannot load, without submitting empty metadata',async()=>{
 vi.mocked(api).mockImplementation(async(path)=>{
  if(String(path).includes('discovery-options'))return {status:200,body:{languages:[],cities:[]}}
  if(String(path).endsWith('/discovery'))return {status:503,body:{message:'Dados indisponíveis.'}}
  return {status:200,body:{applied:false}}
 })
 const user=userEvent.setup();render(<LinkEditor link={{id:'own',name:'Leitura',description:'Livros',status:'PUBLISHED'}} banned={false}/>)
 await screen.findByRole('alert')
 await user.type(screen.getByLabelText('Nova descrição'),' e conversas')
 await user.click(screen.getByRole('button',{name:'Salvar alterações'}));await screen.findByText('Proposta registrada')
 const writes=vi.mocked(api).mock.calls.filter(([,init])=>init?.method==='PATCH')
 expect(writes.map(([path])=>path)).toEqual(['/v1/links/own'])
})

it('apresenta destaque após métricas e expõe todas as ações sem menu',()=>{
 render(<LinkList links={[{id:'ready',name:'Leitura',status:'PUBLISHED'}]} banned={false} stats={{ready:{impressions:10,clicks:2,ctr:20}}}/>)
 const card=screen.getByRole('heading',{name:'Leitura'}).closest('article')!
 const names=within(card).getAllByRole('link').map(link=>link.textContent)
 expect(names).toEqual(['Destacar este link','Ver resultado','Editar','Disponibilidade','Acessar'])
 expect(within(card).queryByText('Mais opções')).toBeNull()
 expect(card.querySelector('.panel-stats')!.compareDocumentPosition(within(card).getByRole('link',{name:'Destacar este link'})) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
})

it('distingue ocultos de publicados, preserva moderação e impede novo destaque',async()=>{
 const links=[{id:'hidden',name:'Oculto publicado',status:'PUBLISHED',ownerHidden:true,occupiesSlot:true},{id:'live',name:'Visível',status:'PUBLISHED'}]
 render(<LinkList links={links} banned={false} stats={{hidden:null,live:null}} onVisibilityChange={vi.fn()}/>)
 const hidden=within(screen.getByRole('heading',{name:'Oculto publicado'}).closest('article')!)
 expect(hidden.getByText('Oculto por você')).toBeTruthy()
 expect(hidden.getByText('Publicado')).toBeTruthy()
 expect(hidden.getByText('Ocupa uma vaga')).toBeTruthy()
 expect(hidden.getByRole('button',{name:'Desocultar'})).toBeTruthy()
 expect(hidden.queryByRole('link',{name:'Destacar este link'})).toBeNull()
 expect(screen.getByText(/Os prazos dos destaques pagos continuam contando/).getAttribute('role')).toBe('status')
 await chooseSelect(screen.getByLabelText('Situação do link'),'published')
 expect(screen.queryByRole('heading',{name:'Oculto publicado'})).toBeNull()
 expect(screen.getByRole('heading',{name:'Visível'})).toBeTruthy()
 await chooseSelect(screen.getByLabelText('Situação do link'),'hidden')
 expect(screen.queryByRole('heading',{name:'Visível'})).toBeNull()
 expect(screen.getByRole('heading',{name:'Oculto publicado'})).toBeTruthy()
})

it('bloqueia cliques repetidos e mantém estado no erro, permitindo nova tentativa',async()=>{
 let reject: (error: Error) => void = () => {}
 const change=vi.fn().mockImplementationOnce(()=>new Promise<void>((_,fail)=>{reject=fail})).mockResolvedValue(undefined)
 render(<LinkList links={[{id:'own',name:'Leitura',status:'PUBLISHED'}]} banned={false} stats={{own:null}} onVisibilityChange={change}/>)
 const hide=screen.getByRole('button',{name:'Ocultar'})
 expect(hide.getAttribute('data-variant')).toBe('danger')
 fireEvent.click(hide);fireEvent.click(hide)
 expect(change).toHaveBeenCalledTimes(1)
 expect(hide.getAttribute('aria-busy')).toBe('true')
 expect(screen.queryByText('Oculto por você')).toBeNull()
 await act(async()=>reject(new Error('Sem conexão.')))
 expect(screen.getByRole('alert').textContent).toContain('Sem conexão.')
 expect((hide as HTMLButtonElement).disabled).toBe(false)
 fireEvent.click(hide)
 await waitFor(()=>expect(change).toHaveBeenCalledTimes(2))
 expect(change).toHaveBeenLastCalledWith('own',true)
 expect(screen.queryByRole('alert')).toBeNull()
})

it('preserva bloqueio de suspensão e suporte somente leitura',()=>{
 const change=vi.fn()
 const props={links:[{id:'own',name:'Leitura',status:'PUBLISHED'}],stats:{own:null},onVisibilityChange:change}
 const view=render(<LinkList {...props} banned/>)
 expect(screen.queryByRole('button',{name:'Ocultar'})).toBeNull()
 view.rerender(<InteractionPolicy readOnly><LinkList {...props} banned={false}/></InteractionPolicy>)
 const hide=screen.getByRole('button',{name:'Ocultar'})
 expect((hide as HTMLButtonElement).disabled).toBe(true)
 fireEvent.click(hide)
 expect(change).not.toHaveBeenCalled()
})
