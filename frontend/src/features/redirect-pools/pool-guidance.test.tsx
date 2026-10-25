import {useState} from 'react'
import {render,screen,fireEvent,cleanup,waitFor,within} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {PoolSetupForm} from './pool-setup-form'
import {PoolEntryDialog} from './pool-entry-dialog'
import {CreatePoolInvite} from './create-pool-invite'
import type {PoolDraft} from './pool-contract'
import type {RedirectSummary} from '@/features/redirects/redirect-contract'
const request=vi.hoisted(()=>vi.fn())
vi.mock('@/features/redirects/redirect-api',async original=>({...await original<typeof import('@/features/redirects/redirect-api')>(),redirectRequest:request}))
afterEach(()=>{cleanup();vi.resetAllMocks()})
const revision=(id:string,label:string)=>({id,number:1,status:'APPROVED' as const,label,destinationUrl:'https://example.com/'+id,requiresAge:false,errorMessage:null,createdAt:'2026-10-19T12:00:00Z',resolvedAt:'2026-10-19T12:00:00Z',accesses:[]})
const item=(id:string,label:string):RedirectSummary=>({id,stablePath:'/r/'+id,version:1,disabled:false,activeRevisionId:id,active:revision(id,label),latest:revision(id,label)})
const pool={version:0,enabled:false,stablePath:'/r/entry',eligibleCount:0,metrics:[],destinations:[]}

it('F23-G01 mostra entrada e destinos distintos, bloqueia avanço vazio e confirma divisão igual antes de persistir',()=>{
 const save=vi.fn();function Harness(){const[draft,setDraft]=useState<PoolDraft>([{revisionId:'a',weight:1,paused:false},{revisionId:'b',weight:1,paused:false}]);return <PoolSetupForm pool={pool} draft={draft} options={[item('entry','Entrada'),item('a','Grupo A'),item('b','Grupo B')]} pending={false} hasMore={false} error="" notice="" onChange={setDraft} onMore={()=>{}} onCreate={()=>{}} onSave={save}/>}
 render(<Harness/>);expect(screen.queryByRole('option',{name:'Entrada'})).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Definir divisão'}));expect((screen.getByRole('radio',{name:/Dividir por igual/}) as HTMLInputElement).checked).toBe(true);expect(screen.queryByLabelText('Participação nas visitas')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Conferir distribuição'}));expect(screen.getAllByText('50% das visitas')).toHaveLength(2);expect(save).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Confirmar e ativar'}));expect(save).toHaveBeenCalledOnce()
})
it('F23-G02 vazio explica cadastro e nenhum destino; link permanente pausado alerta antes de confirmar',()=>{
 const props={pool,options:[],pending:false,hasMore:false,error:'',notice:'',onChange:()=>{},onMore:()=>{},onCreate:()=>{},onSave:()=>{}}
 const {unmount}=render(<PoolSetupForm {...props} draft={[]}/>);expect((screen.getByRole('button',{name:'Definir divisão'}) as HTMLButtonElement).disabled).toBe(true);expect(screen.getByRole('button',{name:'Criar outro link permanente'})).toBeTruthy();unmount();render(<PoolSetupForm {...props} draft={[{revisionId:'a',weight:1,paused:true}]} options={[item('a','Grupo A')]}/>);fireEvent.click(screen.getByRole('button',{name:'Definir divisão'}));fireEvent.click(screen.getByRole('button',{name:'Conferir distribuição'}));expect(screen.getByRole('alert').textContent).toContain('não encaminhará visitantes')
})
it('F23-G03 entrada sem links permanentes oferece cadastro e não oferece ativação sem endereço',()=>{
 render(<PoolEntryDialog items={[]} hasMore={false} pending={false} onMore={()=>{}} onClose={()=>{}} onCreated={()=>{}} trigger={null}/>);expect(screen.getByRole('heading',{name:'Um link, vários destinos'})).toBeTruthy();expect(screen.queryByRole('link',{name:'Escolher destinos'})).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Criar link permanente'}));expect(screen.getByRole('form',{name:'Criar link permanente para distribuição'})).toBeTruthy()
})
it('F23-G04 cadastro reutiliza F12, mantém campos na falha e a mesma chave ao recuperar resposta',async()=>{
 const created=vi.fn();request.mockRejectedValueOnce(new Error('Sem conexão'));render(<CreatePoolInvite onClose={()=>{}} onCreated={created}/>);fireEvent.change(screen.getByLabelText('Nome do link'),{target:{value:'Grupo A'}});fireEvent.change(screen.getByLabelText('Link de destino'),{target:{value:'https://example.com/a'}});fireEvent.submit(screen.getByRole('form'));await screen.findByRole('alert');expect((screen.getByLabelText('Nome do link') as HTMLInputElement).value).toBe('Grupo A');request.mockResolvedValueOnce({id:'a'}).mockResolvedValueOnce({...item('a','Grupo A'),revisions:[revision('a','Grupo A')]});fireEvent.submit(screen.getByRole('form'));await waitFor(()=>expect(created).toHaveBeenCalledOnce());expect(request.mock.calls[0][1].body).toBe(request.mock.calls[1][1].body);expect(JSON.parse(request.mock.calls[0][1].body).expectedRevision).toBe(0)
})

it('F23-G07 edição após falha de leitura corrige o endereço já criado, sem criar outro',async()=>{
 const created=vi.fn();request.mockResolvedValueOnce({id:'a',version:1}).mockRejectedValueOnce(new Error('Sem conexão'));render(<CreatePoolInvite onClose={()=>{}} onCreated={created}/>);fireEvent.change(screen.getByLabelText('Nome do link'),{target:{value:'Grupo A'}});fireEvent.change(screen.getByLabelText('Link de destino'),{target:{value:'https://example.com/a'}});fireEvent.submit(screen.getByRole('form'));await screen.findByRole('alert');fireEvent.change(screen.getByLabelText('Nome do link'),{target:{value:'Nome corrigido'}});request.mockResolvedValueOnce({id:'a',version:2}).mockResolvedValueOnce({...item('a','Nome corrigido'),revisions:[revision('a','Nome corrigido')]});fireEvent.submit(screen.getByRole('form'));await waitFor(()=>expect(created).toHaveBeenCalledOnce());expect(request.mock.calls[2][0]).toBe('/a/destinations');expect(JSON.parse(request.mock.calls[2][1].body).expectedRevision).toBe(1)
})

it('F23-G08 revisão pagina listas longas sem alterar seleção ou percentuais',()=>{
 const options=Array.from({length:7},(_,i)=>item('target-'+i,'Grupo '+i)),draft=options.map(o=>({revisionId:o.id,weight:1,paused:false}));render(<PoolSetupForm pool={pool} draft={draft} options={options} pending={false} hasMore={false} error="" notice="" onChange={()=>{}} onMore={()=>{}} onCreate={()=>{}} onSave={()=>{}}/>);fireEvent.click(screen.getByRole('button',{name:'Definir divisão'}));fireEvent.click(screen.getByRole('button',{name:'Conferir distribuição'}));expect(within(screen.getByRole('list',{name:'Divisão das visitas'})).getAllByRole('listitem')).toHaveLength(3);expect(screen.getAllByText('14,3% das visitas')).toHaveLength(3);fireEvent.click(screen.getByRole('button',{name:'Próxima'}));expect(screen.getByText('Grupo 3',{exact:true})).toBeTruthy();expect(screen.queryByText('Grupo 0',{exact:true})).toBeNull();expect(screen.getAllByText('14,3% das visitas')).toHaveLength(3)
})
