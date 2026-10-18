import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {ProfileChecklistScreen} from './checklist-screen'
import type {ProfileChecklist} from './checklist-contract'
const {request,push}=vi.hoisted(()=>({request:vi.fn(),push:vi.fn()}))
vi.mock('@/features/profiles/profile-api',()=>({profileRequest:request}))
vi.mock('next/navigation',()=>({useRouter:()=>({push})}))
afterEach(()=>{cleanup();vi.resetAllMocks()})
const fixture:ProfileChecklist={profileVersion:1,canPublish:true,requiresFinalValidation:true,reasons:[],publicPath:null,progress:{completed:3,total:4},steps:[{id:'identity',required:true,state:'COMPLETE',title:'Apresentação da página',description:'Nome e endereço salvos.',actionKind:'NAVIGATE',actionLabel:'Editar apresentação',actionPath:'/painel/perfil?secao=pagina'},{id:'publication',required:true,state:'PENDING',title:'Publicar página',description:'A publicação ainda passa pelas validações.',actionKind:'PUBLISH',actionLabel:'Publicar página',actionPath:null},{id:'preview',required:false,state:'SUGGESTED',title:'Conferir a prévia',description:'A prévia não comprova teste em todos os aparelhos.',actionKind:'PREVIEW',actionLabel:'Ver prévia',actionPath:'/painel/perfil/previa'}]}
it('F34-C01 loading becomes actionable server progress, and duplicate publish is blocked until server confirmation',async()=>{
 let resolve!:(value:unknown)=>void;request.mockResolvedValueOnce(fixture).mockImplementationOnce(()=>new Promise(r=>{resolve=r})).mockResolvedValue(fixture)
 render(<ProfileChecklistScreen/>);expect(screen.getByLabelText('Carregando checklist')).toBeTruthy();await screen.findByRole('link',{name:'Editar apresentação'});expect(screen.getByRole('link',{name:'Editar apresentação'}).getAttribute('href')).toBe('/painel/perfil?secao=pagina');expect(screen.getByText('A prévia não comprova teste em todos os aparelhos.')).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'Publicar página'}));fireEvent.click(screen.getByRole('button',{name:/Publicar página/}));expect(request.mock.calls.filter(([path])=>path==='/publish')).toHaveLength(1);expect(screen.queryByText('Publicação concluída.')).toBeNull();resolve({publishedRevisionId:1});await waitFor(()=>expect(request.mock.calls.filter(([path])=>path==='/checklist')).toHaveLength(2))
})
it('F34-C02 server blockers and private data are not turned into publishing permission or rendered dumps',async()=>{
 request.mockResolvedValue({...fixture,canPublish:false,reasons:['Confirme seu e-mail.'],privateSecret:'F34-PRIVATE-SECRET'});render(<ProfileChecklistScreen/>);await screen.findByText('Confirme seu e-mail.');expect((screen.getByRole('button',{name:'Publicar página'}) as HTMLButtonElement).disabled).toBe(true);expect(document.body.textContent).not.toContain('F34-PRIVATE-SECRET');fireEvent.click(screen.getByRole('button',{name:'Publicar página'}));expect(request.mock.calls.some(([path])=>path==='/publish')).toBe(false)
})
it('F34-C03 failures retain a retry and preview records only a requested action before navigating',async()=>{
 request.mockRejectedValueOnce(new Error('Sem conexão.')).mockResolvedValueOnce(fixture).mockResolvedValue(fixture);render(<ProfileChecklistScreen/>);await screen.findByText('Sem conexão.');fireEvent.click(screen.getByRole('button',{name:'Tentar de novo'}));await screen.findByRole('button',{name:'Ver prévia'});fireEvent.click(screen.getByRole('button',{name:'Ver prévia'}));await waitFor(()=>expect(push).toHaveBeenCalledWith('/painel/perfil/previa'));expect(request.mock.calls.some(([path,init])=>path==='/checklist/actions'&&JSON.parse(init.body).action==='PREVIEW_REQUESTED')).toBe(true)
})
