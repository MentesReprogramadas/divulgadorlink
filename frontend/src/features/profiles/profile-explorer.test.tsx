import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {ProfileExplorer} from './profile-explorer'
import {defaultAppearance} from './profile-appearance'
import {emptyProfile} from './profile-contract'
import type {ProfileSearchPage} from './profile-search-contract'
const {load}=vi.hoisted(()=>({load:vi.fn()}))
vi.mock('./profile-search-api',()=>({loadProfileSearch:load}))
afterEach(()=>{cleanup();vi.useRealTimers();vi.resetAllMocks();history.replaceState(null,'','/')})
const initial:Extract<ProfileSearchPage,{restricted:false}>={...emptyProfile(),appearance:{...defaultAppearance,searchEnabled:true},slug:'pagina',name:'Página',restricted:false,publishedRevisionId:1,categories:[{id:'g',name:'Materiais',visible:true}],items:[{id:'i',categoryId:'g',type:'URL',label:'Curso atual',destination:'https://example.org/curso',visible:true}],search:{filters:{q:'',categoryId:null,cursor:null},groups:[{id:'g',name:'Materiais',visible:true}],total:1,nextCursor:null}}
it('traduz busca e filtros mesmo quando o conteúdo do cliente usa o idioma original',()=>{
 render(<ProfileExplorer initial={{...initial,locale:'pt-BR',uiLocale:'en'}} source={{kind:'preview'}}/>);expect(screen.getByRole('searchbox',{name:'Search this page'})).toBeTruthy();expect(screen.queryByLabelText('Idioma da página')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Filters'}));expect(screen.getByText('All groups')).toBeTruthy();expect(screen.getByRole('button',{name:'Done'})).toBeTruthy()
})
it('F18-C01 submit uses only the current page, blocks duplicate sends and never shows stale hrefs while waiting',async()=>{
 let resolve!:(value:ProfileSearchPage)=>void;load.mockImplementation(()=>new Promise<ProfileSearchPage>(done=>{resolve=done}));render(<ProfileExplorer initial={initial} source={{kind:'public',slug:'pagina'}}/>);fireEvent.change(screen.getByRole('searchbox',{name:'Buscar nesta página'}),{target:{value:'Áudio'}});expect(screen.queryByRole('button',{name:'Buscar'})).toBeNull();fireEvent.submit(screen.getByRole('search',{name:'Busca nesta página'}));fireEvent.submit(screen.getByRole('search',{name:'Busca nesta página'}));expect(load).toHaveBeenCalledTimes(1);expect(load.mock.calls[0].slice(0,2)).toEqual([{kind:'public',slug:'pagina'},{q:'Áudio',categoryId:null,cursor:null}]);expect(screen.queryByRole('link',{name:/Curso atual/})).toBeNull();await act(async()=>resolve({...initial,items:[],search:{...initial.search,filters:{q:'Áudio',categoryId:null,cursor:null},total:0}}));expect(screen.getByText('Nenhum link encontrado.')).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Filtros'}));expect(screen.getByRole('button',{name:'Limpar filtros'})).toBeTruthy();expect(location.search).toContain('q=%C3%81udio')
})
it('F18-C02 network error preserves fields and retry uses the exact filter before enabling destinations',async()=>{
 load.mockRejectedValueOnce(new Error('Sem conexão')).mockResolvedValueOnce(initial);render(<ProfileExplorer initial={initial} source={{kind:'preview'}}/>);fireEvent.change(screen.getByRole('searchbox',{name:'Buscar nesta página'}),{target:{value:'Curso'}});fireEvent.submit(screen.getByRole('search',{name:'Busca nesta página'}));expect((await screen.findByRole('alert')).textContent).toContain('Sem conexão');expect(screen.queryByRole('link',{name:/Curso atual/})).toBeNull();expect((screen.getByRole('searchbox',{name:'Buscar nesta página'}) as HTMLInputElement).value).toBe('Curso');fireEvent.click(screen.getByRole('button',{name:'Tentar de novo'}));expect(await screen.findByRole('link',{name:/Curso atual/})).toBeTruthy();expect(load.mock.calls[1].slice(0,2)).toEqual(load.mock.calls[0].slice(0,2));expect(location.search).toBe('')
})
it('encerra o carregamento após erro sem skeleton, vazio falso ou paginação de destinos antigos',async()=>{
 load.mockRejectedValueOnce(new Error('Sem conexão'))
 render(<ProfileExplorer initial={{...initial,search:{...initial.search,nextCursor:'signed-cursor'}}} source={{kind:'preview'}}/>)
 fireEvent.change(screen.getByRole('searchbox',{name:'Buscar nesta página'}),{target:{value:'Curso'}})
 fireEvent.submit(screen.getByRole('search',{name:'Busca nesta página'}))
 await screen.findByRole('alert')
 expect(document.querySelector('[data-skeleton-block]')).toBeNull()
 expect(screen.getByRole('article',{name:'Perfil público'}).getAttribute('aria-busy')).not.toBe('true')
 expect(screen.queryByRole('link',{name:/Curso atual/})).toBeNull()
 expect(screen.queryByText('Nenhum link encontrado.')).toBeNull()
 expect((screen.getByRole('button',{name:'Próximos links'}) as HTMLButtonElement).disabled).toBe(true)
 expect((screen.getByRole('searchbox',{name:'Buscar nesta página'}) as HTMLInputElement).value).toBe('Curso')
})
it('F18-C03 obsolete cursor restarts page one with the same filters, and the age gate has no search metadata',async()=>{
 const paged={...initial,search:{...initial.search,nextCursor:'signed-cursor'}};load.mockRejectedValueOnce(Object.assign(new Error('Os resultados mudaram.'),{status:409})).mockResolvedValueOnce({...initial,search:{...initial.search,filters:{q:'',categoryId:null,cursor:null}}});render(<ProfileExplorer initial={paged} source={{kind:'public',slug:'pagina'}}/>);fireEvent.click(screen.getByRole('button',{name:'Próximos links'}));await screen.findByText('Os resultados mudaram. Mostrando a primeira página.');expect(load.mock.calls[0][1].cursor).toBe('signed-cursor');expect(load.mock.calls[1][1].cursor).toBeNull();expect(screen.getByRole('link',{name:/Curso atual/})).toBeTruthy();load.mockResolvedValueOnce({restricted:true});fireEvent.submit(screen.getByRole('search',{name:'Busca nesta página'}));await screen.findByRole('button',{name:'Tenho 18 anos ou mais'});expect(screen.queryByRole('searchbox',{name:'Buscar nesta página'})).toBeNull();expect(screen.queryByRole('link',{name:/Curso atual/})).toBeNull()
})
it('F18-C04 server timing refreshes the same filters, preserves keyboard controls and keeps failed destinations disabled',async()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2040-01-01Z'));load.mockRejectedValueOnce(new Error('Sem conexão'));render(<ProfileExplorer initial={{...initial,serverNow:'2026-10-18T12:00:00Z',nextBoundary:'2026-10-18T12:00:05Z'}} source={{kind:'public',slug:'pagina'}}/>);await act(()=>vi.advanceTimersByTimeAsync(4000));expect(load).toHaveBeenCalledTimes(1);expect(screen.queryByRole('link',{name:/Curso atual/})).toBeNull();expect(screen.getByRole('alert').textContent).toContain('Sem conexão');expect((screen.getByRole('searchbox',{name:'Buscar nesta página'}) as HTMLInputElement).disabled).toBe(false)
})
it('F18-C07 browser history can supersede a slow request; even a late resolved response cannot replace the current results',async()=>{
 let first!:(value:ProfileSearchPage)=>void,second!:(value:ProfileSearchPage)=>void;load.mockImplementationOnce(()=>new Promise<ProfileSearchPage>(resolve=>{first=resolve})).mockImplementationOnce(()=>new Promise<ProfileSearchPage>(resolve=>{second=resolve}));render(<ProfileExplorer initial={initial} source={{kind:'public',slug:'pagina'}}/>);fireEvent.change(screen.getByRole('searchbox',{name:'Buscar nesta página'}),{target:{value:'anterior'}});fireEvent.submit(screen.getByRole('search',{name:'Busca nesta página'}));history.pushState(null,'','/p/pagina?q=atual');fireEvent(window,new PopStateEvent('popstate'));expect(load).toHaveBeenCalledTimes(2);expect((load.mock.calls[0][2] as AbortSignal).aborted).toBe(true)
 await act(async()=>second({...initial,items:[{...initial.items[0],label:'Resposta atual'}],search:{...initial.search,filters:{q:'atual',categoryId:null,cursor:null}}}));expect(screen.getByRole('link',{name:/Resposta atual/})).toBeTruthy();await act(async()=>first({...initial,items:[{...initial.items[0],label:'Resposta antiga'}],search:{...initial.search,filters:{q:'anterior',categoryId:null,cursor:null}}}));expect(screen.queryByRole('link',{name:/Resposta antiga/})).toBeNull();expect((screen.getByRole('searchbox',{name:'Buscar nesta página'}) as HTMLInputElement).value).toBe('atual')
})

it('automatic search waits for a typing pause, cancels obsolete text and remains editable while loading',async()=>{
 vi.useFakeTimers();let finish!:(value:ProfileSearchPage)=>void;load.mockImplementation(()=>new Promise<ProfileSearchPage>(resolve=>{finish=resolve}))
 render(<ProfileExplorer initial={initial} source={{kind:'public',slug:'pagina'}}/>)
 const input=screen.getByRole('searchbox',{name:'Buscar nesta página'}) as HTMLInputElement
 fireEvent.change(input,{target:{value:'primeiro'}});await act(()=>vi.advanceTimersByTimeAsync(200));fireEvent.change(input,{target:{value:'atual'}})
 await act(()=>vi.advanceTimersByTimeAsync(349));expect(load).not.toHaveBeenCalled();await act(()=>vi.advanceTimersByTimeAsync(1))
 expect(load).toHaveBeenCalledTimes(1);expect(load.mock.calls[0][1].q).toBe('atual');expect(input.disabled).toBe(false)
 fireEvent.change(input,{target:{value:'mais recente'}});expect((load.mock.calls[0][2] as AbortSignal).aborted).toBe(true)
 await act(()=>vi.advanceTimersByTimeAsync(350));expect(load).toHaveBeenCalledTimes(2)
 await act(async()=>finish({...initial,search:{...initial.search,filters:{q:'mais recente',categoryId:null,cursor:null}}}));expect(input.value).toBe('mais recente')
})
it('search is absent by default and its clear control resets text while preserving the chosen group',async()=>{
 const view=render(<ProfileExplorer initial={{...initial,appearance:undefined}} source={{kind:'preview'}}/>)
 expect(screen.queryByRole('searchbox')).toBeNull();view.unmount()
 load.mockResolvedValue({...initial,search:{...initial.search,filters:{q:'',categoryId:'g',cursor:null}}})
 render(<ProfileExplorer initial={{...initial,search:{...initial.search,filters:{q:'Curso',categoryId:'g',cursor:null}}}} source={{kind:'preview'}}/>)
 fireEvent.click(screen.getByRole('button',{name:'Limpar texto da busca'}))
 expect(load.mock.calls[0][1]).toEqual({q:'',categoryId:'g',cursor:null})
 await screen.findByRole('link',{name:/Curso atual/});expect(document.activeElement).toBe(screen.getByRole('searchbox'))
})

it('o idioma automático não muda a URL pública; a escolha explícita continua compartilhável',()=>{
 history.replaceState(null,'','/p/pagina');const view=render(<ProfileExplorer initial={{...initial,search:{...initial.search,filters:{...initial.search.filters,locale:'en'}}}} source={{kind:'public',slug:'pagina'}}/>);expect(location.search).toBe('');view.unmount()
 history.replaceState(null,'','/p/pagina?locale=es');render(<ProfileExplorer initial={{...initial,search:{...initial.search,filters:{...initial.search.filters,locale:'es'}}}} source={{kind:'public',slug:'pagina'}}/>);expect(location.search).toBe('?locale=es')
})
