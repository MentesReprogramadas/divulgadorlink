import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen,within,waitFor} from '@testing-library/react'
import {ContactHandling} from './contact-handling'
import {contactRequest} from './contact-api'
import type {ContactDetail} from './contact-handling-contract'
vi.mock('@/components/ui/responsive-tabs',()=>({ResponsiveTabs:({value,onChange,label,items}:{value:string;onChange:(value:string)=>void;label:string;items:Array<{id:string;label:string}>})=><select aria-label={label} value={value} onChange={event=>onChange(event.target.value)}>{items.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select>}))
vi.mock('@/components/ui/select',()=>({Select:({children,...props}:import('react').SelectHTMLAttributes<HTMLSelectElement>)=><select {...props}>{children}</select>}))
vi.mock('./contact-api',()=>({contactRequest:vi.fn()}))
const request=vi.mocked(contactRequest),saved=vi.fn()
const detail:ContactDetail={id:'contact',answers:{email:'private@example.test'},marketingOptIn:false,createdAt:'2026-10-21T12:00:00Z',expiresAt:'2027-04-19T12:00:00Z',status:'NEW',version:0,sourceSlug:'ana',firstHandledAt:null,notes:[],history:[],nextHistoryCursor:null}
async function tab(name:string){fireEvent.change(screen.getByRole('combobox',{name:'Detalhes do contato'}),{target:{value:({'Notas privadas':'notes',Atendimento:'handling',Histórico:'history'} as Record<string,string>)[name]}})}

afterEach(cleanup)
beforeEach(()=>{vi.clearAllMocks();request.mockResolvedValue(detail)})
it('F35-C01 falha mantém nota e request ID; salvar não duplica e não envia mensagem',async()=>{
 render(<ContactHandling contact={detail} writable onClose={()=>{}} onSaved={saved} trigger={null}/>);await screen.findByRole('combobox',{name:'Detalhes do contato'});await tab('Notas privadas');fireEvent.click(await screen.findByRole('button',{name:'Nova nota'}));fireEvent.change(screen.getByLabelText('Nota privada'),{target:{value:'Atendimento privado'}});request.mockRejectedValueOnce(new Error('Sem conexão'));fireEvent.click(screen.getByRole('button',{name:'Salvar nota'}));await screen.findByText('Sem conexão');expect((screen.getByLabelText('Nota privada') as HTMLTextAreaElement).value).toBe('Atendimento privado');expect(saved).not.toHaveBeenCalled()
 const failed=request.mock.calls.at(-1)!,body=JSON.parse(failed[1]!.body as string);const next={...detail,version:1,notes:[{id:body.id,text:body.text,actorId:'owner',createdAt:detail.createdAt,updatedAt:detail.createdAt}]};request.mockResolvedValueOnce(next);fireEvent.click(screen.getByRole('button',{name:'Salvar nota'}));await screen.findByText('Nota salva.');expect(saved).toHaveBeenCalledWith(next);expect(request.mock.calls.at(-1)![1]!.body).toBe(failed[1]!.body);expect(request.mock.calls.every(([path])=>!path.includes('message')&&!path.includes('send'))).toBe(true)
})
it('F35-C02 responsável sem escrita consulta notas e histórico sem controles de alteração',async()=>{
 request.mockResolvedValue({...detail,notes:[{id:'note',text:'Nota da equipe',actorId:'owner',createdAt:detail.createdAt,updatedAt:detail.createdAt}]});render(<ContactHandling contact={detail} writable={false} onClose={()=>{}} onSaved={saved} trigger={null}/>);await screen.findByRole('combobox',{name:'Detalhes do contato'});expect(screen.queryByRole('button',{name:'Salvar situação'})).toBeNull();await tab('Notas privadas');await screen.findByText('Nota da equipe');for(const name of ['Nova nota','Editar nota','Remover nota'])expect(screen.queryByRole('button',{name})).toBeNull()
})
it('F35-C01 primeira situação só muda após confirmação; origem/data ficam visíveis',async()=>{
 render(<ContactHandling contact={detail} writable onClose={()=>{}} onSaved={saved} trigger={null}/>);await screen.findByText('/p/ana');fireEvent.change(screen.getByRole('combobox',{name:'Situação do atendimento'}),{target:{value:'IN_PROGRESS'}});let finish:(value:ContactDetail)=>void=()=>{};request.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve}));fireEvent.click(screen.getByRole('button',{name:'Salvar situação'}));expect(saved).not.toHaveBeenCalled();const next={...detail,status:'IN_PROGRESS' as const,version:1,firstHandledAt:detail.createdAt};finish(next);await waitFor(()=>expect(saved).toHaveBeenCalledWith(next));expect(within(screen.getByRole('tabpanel')).getByText('/p/ana')).toBeTruthy()
})
