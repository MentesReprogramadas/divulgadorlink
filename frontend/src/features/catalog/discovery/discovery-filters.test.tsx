import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {chooseSelect} from '@/test-select'
import {DiscoveryFilters} from './discovery-filters'
import {emptyDiscovery} from './discovery-contract'
import {api} from '@/lib/api'
const navigate=vi.fn(),scrollTo=vi.fn()
vi.mock('@/lib/api',()=>({api:vi.fn()}))
beforeEach(()=>{
 navigate.mockReset();scrollTo.mockReset();sessionStorage.clear();
 vi.stubGlobal('window',new Proxy(window,{get:(target,key)=>key==='location'?{get href(){return target.location.href},assign:navigate}:key==='scrollTo'?scrollTo:Reflect.get(target,key,target)}));window.history.replaceState(null,'','/busca?q=leitura&cursor=old&rede=site')
 const city={id:'3550308',name:'São Paulo',state:'SP'}
 vi.mocked(api).mockResolvedValue({status:200,body:{cities:[city],exactCity:city,selectedCity:city,languages:[{code:'pt',name:'português'}],modalities:[]}})
})
afterEach(()=>{cleanup();vi.unstubAllGlobals()})
it('automatically applies typed city and selects, preserving the search and resetting its cursor',async()=>{
 const user=userEvent.setup();render(<DiscoveryFilters initial={emptyDiscovery()}/>)
 expect(screen.queryByRole('button',{name:'Aplicar filtros'})).toBeNull()
 await user.type(screen.getByRole('combobox',{name:'Cidade'}),'sao paulo')
 await waitFor(()=>expect(navigate).toHaveBeenCalledWith('/busca?q=leitura&rede=site&cityId=3550308'))
 await chooseSelect(screen.getByLabelText('Idioma'),'pt')
 expect(navigate).toHaveBeenLastCalledWith('/busca?q=leitura&rede=site&cityId=3550308&languageTag=pt')
 await user.click(screen.getByRole('button',{name:'Limpar filtros'}))
 expect(navigate).toHaveBeenLastCalledWith('/busca?q=leitura&rede=site')
})

it('clear cancels an unfinished city lookup and returns focus to the city field',async()=>{
 let release!:(value:unknown)=>void
 const pending=new Promise(resolve=>{release=resolve})
 const original=vi.mocked(api).getMockImplementation()!
 vi.mocked(api).mockImplementation((path,init)=>String(path).includes('?q=')?pending as ReturnType<typeof api>:original(path,init))
 window.history.replaceState(null,'','/busca?q=leitura&rede=site&languageTag=pt')
 const user=userEvent.setup();render(<DiscoveryFilters initial={{...emptyDiscovery(),languageTag:'pt'}}/>)
 await user.type(screen.getByRole('combobox',{name:'Cidade'}),'sao paulo')
 await waitFor(()=>expect(vi.mocked(api).mock.calls.some(([path])=>String(path).includes('?q='))).toBe(true))
 await user.click(screen.getByRole('button',{name:'Limpar filtros'}))
 const field=screen.getByRole('combobox',{name:'Cidade'}) as HTMLInputElement
 expect(field.value).toBe('');expect(document.activeElement).toBe(field)
 release({status:200,body:{cities:[],exactCity:{id:'3550308',name:'São Paulo',state:'SP'}}})
 await waitFor(()=>expect(navigate).toHaveBeenCalledTimes(1))
 expect(navigate).toHaveBeenLastCalledWith('/busca?q=leitura&rede=site')
 expect(field.value).toBe('')
})

it('restores the changed filter and scroll after document navigation',async()=>{
 sessionStorage.setItem('catalogo.discovery.navigation',JSON.stringify({path:location.pathname+location.search,control:2,scroll:260}))
 render(<DiscoveryFilters initial={emptyDiscovery()}/>)
 await waitFor(()=>expect(document.activeElement).toBe(screen.getByRole('combobox',{name:'Participação'})))
 expect(scrollTo).toHaveBeenCalledWith({top:260})
 expect(sessionStorage.getItem('catalogo.discovery.navigation')).toBeNull()
})
it('ignores navigation state from another URL',async()=>{
 sessionStorage.setItem('catalogo.discovery.navigation',JSON.stringify({path:'/other',control:2,scroll:260}))
 render(<DiscoveryFilters initial={emptyDiscovery()}/>)
 await waitFor(()=>expect((screen.getByLabelText('Idioma') as HTMLButtonElement).disabled).toBe(false))
 expect(scrollTo).not.toHaveBeenCalled()
 expect(sessionStorage.getItem('catalogo.discovery.navigation')).toBeNull()
})

it('waits for a disabled language field before restoring focus',async()=>{
 let release!:(value:Awaited<ReturnType<typeof api>>)=>void
 vi.mocked(api).mockImplementation(()=>new Promise(resolve=>{release=resolve}))
 sessionStorage.setItem('catalogo.discovery.navigation',JSON.stringify({path:location.pathname+location.search,control:1,scroll:80}))
 render(<DiscoveryFilters initial={emptyDiscovery()}/>)
 expect(scrollTo).not.toHaveBeenCalled()
 release({status:200,body:{cities:[],languages:[{code:'pt',name:'português'}],modalities:[]}})
 await waitFor(()=>expect(document.activeElement).toBe(screen.getByRole('combobox',{name:'Idioma'})))
 expect(scrollTo).toHaveBeenCalledWith({top:80})
})
it('still navigates when session storage is unavailable',async()=>{
 const write=vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw Error('blocked')})
 try{
  const user=userEvent.setup();render(<DiscoveryFilters initial={{...emptyDiscovery(),languageTag:'pt'}}/>)
  await user.click(screen.getByRole('button',{name:'Limpar filtros'}))
  expect(navigate).toHaveBeenCalledWith('/busca?q=leitura&rede=site')
 }finally{write.mockRestore()}
})
it('clears the navigation status when the browser restores the document',async()=>{
 const user=userEvent.setup();render(<DiscoveryFilters initial={{...emptyDiscovery(),languageTag:'pt'}}/>)
 await user.click(screen.getByRole('button',{name:'Limpar filtros'}))
 expect(screen.getByRole('form',{name:'Filtrar catálogo'}).getAttribute('aria-busy')).toBe('true')
 fireEvent(window,new Event('pageshow'))
 expect(screen.getByRole('form',{name:'Filtrar catálogo'}).getAttribute('aria-busy')).toBe('false')
})
