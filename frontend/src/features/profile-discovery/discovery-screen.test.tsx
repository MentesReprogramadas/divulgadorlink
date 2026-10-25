import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { DiscoveryScreen } from './discovery-screen'
import { DiscoverySettings } from './discovery-settings'
import { directoryRequest, type DirectoryResult } from './discovery-api'
vi.mock('./discovery-api',()=>({directoryRequest:vi.fn()}))
afterEach(cleanup)
const request=vi.mocked(directoryRequest)
const initial:DirectoryResult={profiles:[{id:'one',slug:'ana',name:'Ana',bio:'Projetos',avatarUrl:null,niche:{id:'n',name:'Educação'},sponsored:false,following:false}],niches:[{id:'n',name:'Educação',slug:'educacao'}],nextCursor:null}
beforeEach(()=>{vi.stubGlobal('ResizeObserver',class {observe(){}disconnect(){}});vi.clearAllMocks();request.mockResolvedValue(initial)})
it('F24-C01 segue apenas após confirmação; impede repetição e permite deixar de seguir',async()=>{
 render(<DiscoveryScreen initial={initial}/>);await waitFor(()=>expect(request).toHaveBeenCalledTimes(1))
 let finish:(value:unknown)=>void=()=>{};request.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve}))
 fireEvent.click(screen.getByRole('button',{name:'Seguir'}));expect((screen.getByRole('button',{name:'Seguir'}) as HTMLButtonElement).disabled).toBe(true);expect(screen.queryByRole('button',{name:'Deixar de seguir'})).toBeNull()
 finish({following:true});await screen.findByRole('button',{name:'Deixar de seguir'});request.mockResolvedValueOnce({following:false});fireEvent.click(screen.getByRole('button',{name:'Deixar de seguir'}));await screen.findByRole('button',{name:'Seguir'})
 expect(request).toHaveBeenCalledWith('me/followed-profiles/one',{method:'PUT'});expect(request).toHaveBeenCalledWith('me/followed-profiles/one',{method:'DELETE'})
})
it('F24-C01 erro não anuncia sucesso e mantém entrada; lista vazia orienta nova busca',async()=>{
 request.mockResolvedValueOnce({...initial,profiles:[]});render(<DiscoveryScreen initial={{...initial,profiles:[]}}/>);await screen.findByText('Nenhuma página encontrada. Tente outro nome ou categoria.')
 fireEvent.change(screen.getByLabelText('Buscar páginas'),{target:{value:'Projetos'}});request.mockRejectedValueOnce(new Error('Sem conexão. Tente novamente.'));await screen.findByRole('alert');expect((screen.getByLabelText('Buscar páginas') as HTMLInputElement).value).toBe('Projetos')
})
it('F24-C02/T03 patrocínio aparece somente quando informado pelo servidor',async()=>{
 const sponsored={...initial,profiles:[{...initial.profiles[0],sponsored:true}]};request.mockResolvedValueOnce(sponsored);render(<DiscoveryScreen initial={sponsored}/>);expect(screen.getByText('Patrocinado')).toBeTruthy();expect(screen.queryByText('ownerId')).toBeNull()
})
it('F24-C03 configuração separada do rascunho persiste com versão e mantém erro recuperável',async()=>{
 request.mockResolvedValue({enabled:false,nicheId:null,version:0,niches:[]});render(<DiscoverySettings ready/>);const checkbox=await screen.findByRole('checkbox',{name:'Mostrar na descoberta de páginas'});fireEvent.click(checkbox);request.mockRejectedValueOnce(new Error('Falha ao salvar'));fireEvent.click(screen.getByRole('button',{name:'Salvar descoberta'}));await screen.findByRole('alert');expect((checkbox as HTMLInputElement).checked).toBe(true);expect(request).toHaveBeenCalledWith('me/profile/discovery',{method:'PATCH',body:JSON.stringify({enabled:true,nicheId:null,expectedVersion:0})})
})

it('F24-C04 busca após pausa e aplica categoria sem botão Buscar',async()=>{render(<DiscoveryScreen initial={initial}/>);await waitFor(()=>expect(request).toHaveBeenCalledTimes(1));fireEvent.change(screen.getByLabelText('Buscar páginas'),{target:{value:'Ana'}});fireEvent.change(screen.getByLabelText('Buscar páginas'),{target:{value:'Ana final'}});await waitFor(()=>expect(request).toHaveBeenCalledWith('profiles?q=Ana+final',expect.objectContaining({signal:expect.any(AbortSignal)})));expect(request.mock.calls.filter(([path])=>path==='profiles?q=Ana')).toHaveLength(0);expect(screen.queryByRole('button',{name:'Buscar'})).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Educação'}));await waitFor(()=>expect(request.mock.calls.at(-1)?.[0]).toContain('nicheId=n'))})

it('reutiliza título e descrição dos links e mantém Seguir antes da ação principal Ver página',async()=>{
 const {container}=render(<DiscoveryScreen initial={initial}/>);await waitFor(()=>expect(request).toHaveBeenCalledTimes(1));const card=container.querySelector('article')!;expect(card.querySelector('h2 [title="Ana"]')).toBeTruthy();const footer=card.querySelector('footer')!;expect(Array.from(footer.children).map(el=>el.textContent)).toEqual(['Seguir','Ver página']);expect(footer.children[0].getAttribute('data-variant')).toBe('secondary');expect(footer.children[1].getAttribute('data-variant')).toBe('primary')
})

it('aborta consulta substituída e impede resposta antiga nas sugestões',async()=>{
 let finish:(value:DirectoryResult)=>void=()=>{}
 request.mockImplementationOnce(()=>new Promise<DirectoryResult>(resolve=>{finish=resolve}))
 render(<DiscoveryScreen initial={initial}/>);await waitFor(()=>expect(request).toHaveBeenCalledTimes(1))
 const signal=request.mock.calls[0][1]?.signal
 fireEvent.change(screen.getByRole('combobox'),{target:{value:'Bia'}})
 expect(signal?.aborted).toBe(true)
 const next={...initial,profiles:[{...initial.profiles[0],id:'two',slug:'bia',name:'Bia'}]}
 request.mockResolvedValue(next)
 await screen.findByRole('option',{name:/Bia/})
 finish({...initial,profiles:[{...initial.profiles[0],name:'Resposta antiga'}]})
 await waitFor(()=>expect(screen.queryByRole('option',{name:/Resposta antiga/})).toBeNull())
 expect(screen.getByRole('option',{name:/Bia/}).getAttribute('href')).toBe('/p/bia')
})

it('finalizar composição sem mudar a busca não cancela a consulta atual',async()=>{
 let finish:(value:DirectoryResult)=>void=()=>{}
 request.mockImplementationOnce(()=>new Promise<DirectoryResult>(resolve=>{finish=resolve}))
 render(<DiscoveryScreen initial={initial} query="Ana"/>);await waitFor(()=>expect(request).toHaveBeenCalledTimes(1))
 const input=screen.getByRole('combobox'),signal=request.mock.calls[0][1]?.signal
 fireEvent.compositionStart(input);fireEvent.compositionEnd(input)
 expect(signal?.aborted).toBe(false)
 finish(initial)
 await screen.findByRole('option',{name:/Ana/})
})
