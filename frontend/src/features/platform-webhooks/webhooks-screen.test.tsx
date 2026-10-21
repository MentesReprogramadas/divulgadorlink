import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {WebhooksScreen} from './webhooks-screen'
import {webhookRequest,type WebhookState} from './webhook-api'
import {WorkspaceIdentity} from '@/features/workspace-team/workspace-access'
vi.mock('./webhook-api',async()=>{const actual=await vi.importActual('./webhook-api');return{...actual,webhookRequest:vi.fn()}})
const request=vi.mocked(webhookRequest),empty:WebhookState={configured:true,endpoints:[],deliveries:[]}
afterEach(cleanup)
beforeEach(()=>{vi.clearAllMocks();request.mockResolvedValue(empty)})
it('F30-C01 lista primeiro; criar abre formulário separado, valida eventos e mostra segredo apenas após confirmar',async()=>{
 render(<WebhooksScreen/>);await screen.findByRole('button',{name:'Nova integração'});expect(screen.queryByLabelText('Endereço que receberá os avisos')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Nova integração'}));fireEvent.change(screen.getByLabelText('Endereço que receberá os avisos'),{target:{value:'https://example.com/hooks'}})
 request.mockResolvedValueOnce({secret:'secret-only-once'}).mockResolvedValueOnce({...empty,endpoints:[{id:'one',url:'https://example.com/hooks',eventTypes:['contact.received'],enabled:true,version:1}]});fireEvent.click(screen.getByRole('button',{name:'Salvar integração'}));await screen.findByText('secret-only-once');fireEvent.click(screen.getByRole('button',{name:'Já guardei'}));expect(screen.queryByText('secret-only-once')).toBeNull();await screen.findByText('https://example.com/hooks');expect(request).toHaveBeenCalledWith('endpoints',expect.objectContaining({method:'POST'}))
})
it('F30-C02 sem escrita oculta criação, rotação, teste e desativação',async()=>{
 request.mockResolvedValue({...empty,endpoints:[{id:'one',url:'https://example.com/hooks',eventTypes:['contact.received'],enabled:true,version:1}]});render(<WorkspaceIdentity.Provider value={{ownerId:'owner',grants:{integrations:{read:true,write:false}}}}><WebhooksScreen/></WorkspaceIdentity.Provider>);await screen.findByText('https://example.com/hooks');for(const name of ['Nova integração','Editar','Testar envio','Renovar chave','Desativar','Remover'])expect(screen.queryByRole('button',{name})).toBeNull()
})
it('F30-C01 falha não fecha formulário ou anuncia sucesso; campos permanecem preenchidos',async()=>{
 render(<WebhooksScreen/>);await screen.findByRole('button',{name:'Nova integração'});fireEvent.click(screen.getByRole('button',{name:'Nova integração'}));fireEvent.change(screen.getByLabelText('Endereço que receberá os avisos'),{target:{value:'https://example.com/hooks'}});request.mockRejectedValueOnce(new Error('Rede indisponível'));fireEvent.click(screen.getByRole('button',{name:'Salvar integração'}));await screen.findByText('Rede indisponível');expect((screen.getByLabelText('Endereço que receberá os avisos') as HTMLInputElement).value).toBe('https://example.com/hooks');await waitFor(()=>expect((screen.getByRole('button',{name:'Salvar integração'}) as HTMLButtonElement).disabled).toBe(false));expect(screen.queryByText('Integração salva.')).toBeNull()
})
