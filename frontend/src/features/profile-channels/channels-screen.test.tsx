import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {ChannelsScreen} from './channels-screen'
import type {ChannelGroupsResponse} from './channel-contract'
const {request,push}=vi.hoisted(()=>({request:vi.fn(),push:vi.fn()}))
vi.mock('@/features/profiles/profile-api',async original=>({...await original<typeof import('@/features/profiles/profile-api')>(),profileRequest:request}))
vi.mock('next/navigation',()=>({useRouter:()=>({push})}))
afterEach(()=>{cleanup();vi.resetAllMocks()})
const data:ChannelGroupsResponse={profileVersion:1,publishedVersion:1,networks:[],groups:[]}
it('F37-C04 management separates actions, filters and empty results and retries an actual load failure',async()=>{
 request.mockRejectedValueOnce(new Error('Sem conexão.')).mockResolvedValue({items:[],nextCursor:null});render(<ChannelsScreen/>);await screen.findByText('Sem conexão.');request.mockImplementation(async path=>path==='/channel-groups'?data:{items:[],nextCursor:null});fireEvent.click(screen.getByRole('button',{name:'Tentar de novo'}));await screen.findByRole('link',{name:'Novo grupo'});expect(screen.getByRole('link',{name:'Novo grupo'}).getAttribute('href')).toBe('/painel/perfil/canais/novo');expect(screen.getByRole('search',{name:'Filtros de canais'})).toBeTruthy();expect(screen.getByText('Reúna os canais da sua comunidade em um só grupo.')).toBeTruthy()
})
it('F37-C05 stepped drafting keeps data, posts an explicit allowlist once and navigates only after persistence',async()=>{
 let resolveSave!:(value:unknown)=>void;request.mockImplementation(async(path,init)=>init?.method==='PUT'?new Promise(resolve=>{resolveSave=resolve}):path==='/channel-groups'?data:{items:[],nextCursor:null});render(<ChannelsScreen entry={{kind:'NEW'}}/>);await waitFor(()=>expect(screen.getByLabelText('Canais da minha página').getAttribute('aria-busy')).not.toBe('true'));fireEvent.change(await screen.findByLabelText('Título do grupo de canais'),{target:{value:'Minha comunidade'}});fireEvent.click(screen.getByRole('button',{name:'Avançar'}));fireEvent.click(screen.getByRole('button',{name:'Avançar'}));const save=screen.getByRole('button',{name:'Salvar grupo'});fireEvent.click(save);fireEvent.click(save);await waitFor(()=>expect(request.mock.calls.filter(([,init])=>init?.method==='PUT')).toHaveLength(1));expect(push).not.toHaveBeenCalled();const body=JSON.parse(request.mock.calls.find(([,init])=>init?.method==='PUT')![1].body);expect(body).toEqual({expectedVersion:1,name:'Minha comunidade',visible:true,channels:[]});resolveSave({draft:{version:2}});await waitFor(()=>expect(push).toHaveBeenCalledWith('/painel/perfil/canais'))
})
