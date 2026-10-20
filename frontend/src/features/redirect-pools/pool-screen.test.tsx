import userEvent from '@testing-library/user-event'
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {PoolScreen} from './pool-screen'
const request=vi.hoisted(()=>vi.fn())
vi.mock('@/features/redirects/redirect-api',()=>({redirectRequest:request}))
afterEach(()=>{cleanup();vi.resetAllMocks()})
const pool={version:2,enabled:true,stablePath:'/r/base',eligibleCount:1,metrics:[{revisionId:'revision',clicks:3}],destinations:[{revisionId:'revision',weight:3,paused:false,label:'Grupo de estudos',eligible:true,destinationUrl:'https://example.com'}]}
const source={items:[{id:'target',activeRevisionId:'revision',active:{id:'revision',label:'Grupo de estudos'},disabled:false}],nextCursor:null}
it('F23-C01 pausa só muda após resposta; erro é recuperável e preserva configuração',async()=>{
 request.mockResolvedValueOnce(pool).mockResolvedValueOnce(source).mockRejectedValueOnce(new Error('Sem conexão'))
 render(<PoolScreen id="base"/>);const pause=await screen.findByRole('button',{name:'Pausar destino'});fireEvent.click(pause);await screen.findByRole('alert');expect(screen.queryByRole('button',{name:'Retomar destino'})).toBeNull();request.mockResolvedValueOnce({...pool,version:3,destinations:pool.destinations.map(d=>({...d,paused:true}))});fireEvent.click(pause);await screen.findByRole('button',{name:'Retomar destino'});expect(request.mock.calls[3][0]).toBe('/base/pool/revision')
})
it('F23-C02 vazio não expõe destinos fictícios e formulário salva seleção e peso reais',async()=>{
 request.mockResolvedValueOnce({...pool,enabled:false,destinations:[]}).mockResolvedValueOnce(source)
 const user=userEvent.setup();render(<PoolScreen id="base"/>);fireEvent.click(await screen.findByRole('button',{name:'Começar configuração'}));await screen.findByRole('dialog',{name:'Configurar distribuição'});await user.click(screen.getByLabelText('Qual convite vai receber visitas?'));await user.click(screen.getByRole('option',{name:'Grupo de estudos'}));fireEvent.click(screen.getByRole('button',{name:'Incluir convite'}));fireEvent.click(screen.getByRole('button',{name:'Definir divisão'}));fireEvent.click(screen.getByRole('radio',{name:/Priorizar alguns convites/}));fireEvent.change(screen.getByLabelText('Participação nas visitas'),{target:{value:'3'}});fireEvent.click(screen.getByRole('button',{name:'Conferir distribuição'}));request.mockResolvedValueOnce(pool);fireEvent.click(screen.getByRole('button',{name:'Confirmar e ativar'}));await waitFor(()=>expect(screen.queryByRole('dialog',{name:'Configurar distribuição'})).toBeNull());expect(JSON.parse(request.mock.calls[2][1].body).destinations).toEqual([{revisionId:'revision',weight:3,paused:false}])
})
it('F23-C03 abertura guiada consome o parâmetro para não reabrir o diálogo ao recarregar',async()=>{const previous=location.pathname+location.search;history.replaceState(null,'','/painel/convites/base/distribuicao?configurar=1');try{request.mockResolvedValueOnce({...pool,enabled:false,destinations:[]}).mockResolvedValueOnce(source);render(<PoolScreen id="base" startOpen/>);await screen.findByRole('dialog',{name:'Configurar distribuição'});await waitFor(()=>expect(location.search).toBe(''));fireEvent.click(screen.getByRole('button',{name:'Fechar janela'}));await waitFor(()=>expect(screen.queryByRole('dialog',{name:'Configurar distribuição'})).toBeNull())}finally{history.replaceState(null,'',previous)}})
