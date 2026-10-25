import {afterEach,expect,it,vi} from 'vitest'
import {cleanup,render,screen,waitFor,within} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {chooseSelect} from '@/test-select'
import {api} from '@/lib/api'
import {LinkEditor,LinkList} from './panel-links'

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
