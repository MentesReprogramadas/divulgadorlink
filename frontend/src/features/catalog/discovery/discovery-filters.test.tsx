import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {cleanup,render,screen,waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {chooseSelect} from '@/test-select'
import {DiscoveryFilters} from './discovery-filters'
import {emptyDiscovery} from './discovery-contract'
import {api} from '@/lib/api'
const push=vi.fn()
vi.mock('next/navigation',()=>({useRouter:()=>({push})}))
vi.mock('@/lib/api',()=>({api:vi.fn()}))
beforeEach(()=>{
 push.mockReset();window.history.replaceState(null,'','/busca?q=leitura&cursor=old&rede=site')
 const city={id:'3550308',name:'São Paulo',state:'SP'}
 vi.mocked(api).mockResolvedValue({status:200,body:{cities:[city],exactCity:city,selectedCity:city,languages:[{code:'pt',name:'português'}],modalities:[]}})
})
afterEach(cleanup)
it('automatically applies typed city and selects, preserving the search and resetting its cursor',async()=>{
 const user=userEvent.setup();render(<DiscoveryFilters initial={emptyDiscovery()}/>)
 expect(screen.queryByRole('button',{name:'Aplicar filtros'})).toBeNull()
 await user.type(screen.getByRole('combobox',{name:'Cidade'}),'sao paulo')
 await waitFor(()=>expect(push).toHaveBeenCalledWith('/busca?q=leitura&rede=site&cityId=3550308',{scroll:false}))
 await chooseSelect(screen.getByLabelText('Idioma'),'pt')
 expect(push).toHaveBeenLastCalledWith('/busca?q=leitura&rede=site&cityId=3550308&languageTag=pt',{scroll:false})
 await user.click(screen.getByRole('button',{name:'Limpar filtros'}))
 expect(push).toHaveBeenLastCalledWith('/busca?q=leitura&rede=site',{scroll:false})
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
 await waitFor(()=>expect(push).toHaveBeenCalledTimes(1))
 expect(push).toHaveBeenLastCalledWith('/busca?q=leitura&rede=site',{scroll:false})
 expect(field.value).toBe('')
})
