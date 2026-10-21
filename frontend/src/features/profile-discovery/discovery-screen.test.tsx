import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { DiscoveryScreen } from './discovery-screen'
import { DiscoverySettings } from './discovery-settings'
import { directoryRequest, type DirectoryResult } from './discovery-api'
vi.mock('./discovery-api',()=>({directoryRequest:vi.fn()}))
afterEach(cleanup)
const request=vi.mocked(directoryRequest)
const initial:DirectoryResult={profiles:[{id:'one',slug:'ana',name:'Ana',bio:'Projetos',avatarUrl:null,niche:{id:'n',name:'Educação'},sponsored:false,following:false}],niches:[{id:'n',name:'Educação'}],nextCursor:null}
beforeEach(()=>{vi.clearAllMocks();request.mockResolvedValue(initial)})
it('F24-C01 segue apenas após confirmação; impede repetição e permite deixar de seguir',async()=>{
 render(<DiscoveryScreen initial={initial}/>);await waitFor(()=>expect(request).toHaveBeenCalledTimes(1))
 let finish:(value:unknown)=>void=()=>{};request.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve}))
 fireEvent.click(screen.getByRole('button',{name:'Seguir'}));expect((screen.getByRole('button',{name:'Seguir'}) as HTMLButtonElement).disabled).toBe(true);expect(screen.queryByRole('button',{name:'Deixar de seguir'})).toBeNull()
 finish({following:true});await screen.findByRole('button',{name:'Deixar de seguir'});request.mockResolvedValueOnce({following:false});fireEvent.click(screen.getByRole('button',{name:'Deixar de seguir'}));await screen.findByRole('button',{name:'Seguir'})
 expect(request).toHaveBeenCalledWith('me/followed-profiles/one',{method:'PUT'});expect(request).toHaveBeenCalledWith('me/followed-profiles/one',{method:'DELETE'})
})
it('F24-C01 erro não anuncia sucesso e mantém entrada; lista vazia orienta nova busca',async()=>{
 request.mockResolvedValueOnce({...initial,profiles:[]});render(<DiscoveryScreen initial={{...initial,profiles:[]}}/>);await screen.findByText('Nenhuma página encontrada. Tente outro nome ou nicho.')
 fireEvent.change(screen.getByLabelText('Buscar páginas'),{target:{value:'Projetos'}});request.mockRejectedValueOnce(new Error('Sem conexão. Tente novamente.'));fireEvent.click(screen.getByRole('button',{name:'Buscar'}));await screen.findByRole('alert');expect((screen.getByLabelText('Buscar páginas') as HTMLInputElement).value).toBe('Projetos')
})
it('F24-C02/T03 patrocínio aparece somente quando informado pelo servidor',async()=>{
 const sponsored={...initial,profiles:[{...initial.profiles[0],sponsored:true}]};request.mockResolvedValueOnce(sponsored);render(<DiscoveryScreen initial={sponsored}/>);expect(screen.getByText('Patrocinado')).toBeTruthy();expect(screen.queryByText('ownerId')).toBeNull()
})
it('F24-C03 configuração separada do rascunho persiste com versão e mantém erro recuperável',async()=>{
 request.mockResolvedValue({enabled:false,nicheId:null,version:0,niches:[]});render(<DiscoverySettings ready/>);const checkbox=await screen.findByRole('checkbox',{name:'Mostrar na descoberta de páginas'});fireEvent.click(checkbox);request.mockRejectedValueOnce(new Error('Falha ao salvar'));fireEvent.click(screen.getByRole('button',{name:'Salvar descoberta'}));await screen.findByRole('alert');expect((checkbox as HTMLInputElement).checked).toBe(true);expect(request).toHaveBeenCalledWith('me/profile/discovery',{method:'PATCH',body:JSON.stringify({enabled:true,nicheId:null,expectedVersion:0})})
})
