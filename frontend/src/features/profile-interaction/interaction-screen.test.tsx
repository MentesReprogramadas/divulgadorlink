vi.mock('next/dynamic', () => ({ default: () => () => null }))
import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {InteractionScreen} from './interaction-screen'
import {interactionViewport,scrollReach,type InteractionReport} from './interaction-contract'
const api=vi.hoisted(()=>vi.fn())
vi.mock('@/lib/api',()=>({api}))
afterEach(()=>{cleanup();vi.resetAllMocks()})
const report:InteractionReport={range:{from:'2026-10-01',to:'2026-10-18'},revision:1,viewport:'ALL',revisions:[1],minimumSample:10,retentionDays:180,coverage:'Com consentimento',summary:{available:false,sessions:0,pageViews:null,blocks:[{id:'button',label:'Meu site',impressions:null,clicks:null,ctr:null}],scrollBuckets:[25,50,75,100].map(threshold=>({threshold,label:threshold+'%',reached:null}))}}
it('F31-C01 renders null as unavailable, filters and changes preferences exactly once while a save is pending',async()=>{
 let resolve!:(value:unknown)=>void
 api.mockImplementation((path:string,init?:RequestInit)=>init?new Promise(r=>{resolve=r}):Promise.resolve({status:200,body:path.includes('measurement')?{allowed:true,enabled:false,version:0}:report}))
 render(<InteractionScreen/>);expect(screen.getByLabelText('Carregando métricas')).toBeTruthy();await screen.findByText('Ainda não há dados suficientes para este período e filtro.');expect(screen.getAllByText('Indisponível').length).toBeGreaterThan(1);expect(screen.queryByText('Meu site')).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'Ativar medição'}));fireEvent.click(screen.getByRole('button',{name:/Ativar medição/}));expect(api.mock.calls.filter(([,init])=>init?.method==='PATCH')).toHaveLength(1)
 resolve({status:200,body:{allowed:true,enabled:true,version:1}});await screen.findByRole('button',{name:'Pausar medição'});expect(screen.getByText('Medição ativada para visitantes que aceitarem cookies.')).toBeTruthy()
 fireEvent.change(screen.getByLabelText('De'),{target:{value:'2026-10-10'}});await waitFor(()=>expect(api.mock.calls.some(([path])=>path.includes('from=2026-10-10'))).toBe(true))
})
it('F31-C02 locked capability has no collect/report action; recoverable failures keep the retry',async()=>{
 api.mockResolvedValueOnce({status:200,body:{allowed:false,enabled:false,version:0}});const view=render(<InteractionScreen/>);await screen.findByText('Seu plano não inclui métricas da página.');expect(api).toHaveBeenCalledTimes(1);expect(screen.queryByRole('button',{name:'Ativar medição'})).toBeNull();view.unmount()
 api.mockRejectedValueOnce(new Error('Failed to fetch')).mockResolvedValue({status:200,body:{allowed:false,enabled:false,version:0}});render(<InteractionScreen/>);await screen.findByText('Sem conexão. Tente novamente.');expect(screen.queryByText('Failed to fetch')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Tentar de novo'}));await screen.findByText('Seu plano não inclui métricas da página.')
})
it('F31-U05 viewport is coarse and reaching half a page never implies reading',()=>{
 expect([interactionViewport(390),interactionViewport(768),interactionViewport(1440)]).toEqual(['MOBILE','TABLET','DESKTOP']);expect(scrollReach(0,500,1000)).toBe(50);expect(scrollReach(950,500,1000)).toBe(100)
})
it('F31-C05 a sufficient sample renders actual button counts and rates after loading',async()=>{
 api.mockImplementation((path:string)=>Promise.resolve({status:200,body:path.includes('measurement')?{allowed:true,enabled:true,version:1}:{...report,summary:{...report.summary,available:true,sessions:10,pageViews:10,blocks:[{id:'button',label:'Meu site',impressions:10,clicks:3,ctr:30}]}}}))
 render(<InteractionScreen/>);await screen.findByRole('heading',{name:'Interação dos links'});fireEvent.click(within(screen.getByRole('region',{name:'Interação dos links'})).getByRole('tab',{name:'Tabela'}));expect(screen.getByText('Meu site')).toBeTruthy();expect(screen.getByText('30%')).toBeTruthy();expect(screen.queryByText('Ainda não há dados suficientes para este período e filtro.')).toBeNull()
})
it('F31-C06 a missing own page offers creation without filters or a false paused status',async()=>{
 api.mockResolvedValue({status:404,body:{message:'Crie sua página primeiro.'}});render(<InteractionScreen/>);await screen.findByRole('link',{name:'Criar minha página'});expect(screen.queryByLabelText('De')).toBeNull();expect(screen.queryByText(/Medição pausada/)).toBeNull();expect(screen.queryByRole('button',{name:'Aplicar filtros'})).toBeNull()
})
it('F31-C08 an expired paid capability still allows the owner to pause an already enabled preference',async()=>{
 api.mockImplementation((_path:string,init?:RequestInit)=>Promise.resolve({status:200,body:init?{allowed:false,enabled:false,version:2}:{allowed:false,enabled:true,version:1}}))
 render(<InteractionScreen/>);await screen.findByRole('button',{name:'Pausar medição'});fireEvent.click(screen.getByRole('button',{name:'Pausar medição'}));await waitFor(()=>expect(screen.queryByRole('button',{name:'Pausar medição'})).toBeNull());expect(api.mock.calls.filter(([,init])=>init?.method==='PATCH')).toHaveLength(1);expect(api.mock.calls.some(([path])=>path.includes('interaction'))).toBe(false)
})
