import {act,cleanup,fireEvent,render,screen,within} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {TemplatesScreen} from './templates-screen'
import {emptyProfile,type ProfileState} from '@/features/profiles/profile-contract'
import {defaultAppearance} from '@/features/profiles/profile-appearance'
import {chooseSelect} from '@/test-select'
import type {ProfileTemplate} from './template-contract'
const {load,apply,request}=vi.hoisted(()=>({load:vi.fn(),apply:vi.fn(),request:vi.fn()}))
vi.mock('./template-api',()=>({loadProfileTemplates:load,applyProfileTemplate:apply}))
vi.mock('@/features/profiles/profile-api',()=>({profileRequest:request}))
afterEach(()=>{cleanup();vi.resetAllMocks()})
const models:ProfileTemplate[]=[{versionId:'creator-v1',activity:'CREATOR',title:'Criadores',description:'Conteúdos e contato',appearance:defaultAppearance,demoName:'Seu conteúdo',demoBio:'Exemplo fictício',groups:[{key:'content',name:'Conteúdos',links:[{key:'videos',label:'Ver conteúdos',destination:'https://example.com/modelos/criadores/videos'}]}]},{versionId:'shop-v1',activity:'SHOP',title:'Lojas',description:'Produtos e atendimento',appearance:defaultAppearance,demoName:'Sua loja',demoBio:'Exemplo fictício',groups:[]}]
const draft={...emptyProfile(),slug:'pagina-real',name:'Página real',version:7,categories:[{id:'g',name:'Meus conteúdos',visible:true}],items:[]}
const state:ProfileState={draft,publishedVersion:7,publishedContent:draft}
it('F16-C03 loading is explicit; selection never publishes; pending application has one request and only shows success after confirmation',async()=>{
  let resolveLoad!:(value:ProfileTemplate[])=>void,resolveApply!:(value:ProfileState)=>void;load.mockImplementation(()=>new Promise<ProfileTemplate[]>(resolve=>{resolveLoad=resolve}));request.mockResolvedValue(state);apply.mockImplementation(()=>new Promise<ProfileState>(resolve=>{resolveApply=resolve}))
  render(<TemplatesScreen/>);expect(screen.getByRole('status',{name:'Carregando modelos'})).toBeTruthy();expect(screen.queryByText(/Modelo aplicado/)).toBeNull()
  await act(async()=>resolveLoad(models));fireEvent.click(within(screen.getByRole('article',{name:'Criadores'})).getByRole('button',{name:'Ver modelo'}));fireEvent.click(screen.getByRole('button',{name:'Continuar'}));const button=screen.getByRole('button',{name:'Aplicar ao rascunho'});fireEvent.click(button);fireEvent.click(button)
  expect(apply).toHaveBeenCalledTimes(1);expect(apply).toHaveBeenCalledWith('creator-v1',true,7,false);expect(screen.queryByText(/Modelo aplicado/)).toBeNull()
  await act(async()=>resolveApply({...state,draft:{...draft,version:8}}));expect(screen.queryByRole('dialog')).toBeNull();expect(screen.getByRole('status').textContent).toContain('Estilo aplicado ao rascunho');expect(request.mock.calls).toEqual([['']])
})
it('F16-C04 failure has retry; activity filtering keeps unrelated models out without counter/empty-state clutter',async()=>{
  load.mockRejectedValueOnce(new Error('Sem conexão')).mockResolvedValue(models);request.mockResolvedValue(state);render(<TemplatesScreen/>);expect((await screen.findByRole('alert')).textContent).toContain('Sem conexão');fireEvent.click(screen.getByRole('button',{name:'Tentar de novo'}));await screen.findByRole('article',{name:'Criadores'})
  await chooseSelect(screen.getByLabelText('Tipo de página'),'SHOP');expect(screen.queryByRole('article',{name:'Criadores'})).toBeNull();expect(screen.getByRole('article',{name:'Lojas'})).toBeTruthy();expect(screen.queryByText(/0 modelos|Nenhum modelo/)).toBeNull()
})
it('F16-C05 a missing identity has one next step and cannot claim a template was applied to an unsaved page',async()=>{
  load.mockResolvedValue(models);request.mockResolvedValue({draft:null,publishedVersion:null});render(<TemplatesScreen/>);expect(await screen.findByRole('link',{name:'Criar minha página'})).toBeTruthy();expect(screen.queryByRole('button',{name:'Ver modelo'})).toBeNull();expect(apply).not.toHaveBeenCalled()
})
