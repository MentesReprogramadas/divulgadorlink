import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {MediaKitScreen} from './media-kit-screen'
const {request}=vi.hoisted(()=>({request:vi.fn()}))
vi.mock('@/features/profiles/profile-api',async importOriginal=>({...await importOriginal<typeof import('@/features/profiles/profile-api')>(),profileRequest:request}))
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()})}))
afterEach(()=>{cleanup();vi.resetAllMocks()})
const data={draft:{publicFields:{showBio:true,showPhoto:true,contactIds:[]},metricSelections:[],manualMetrics:[]},version:1,publishedVersion:null,hasPublishedProfile:true,publicPath:'/p/ana/midia-kit',changed:true,contacts:[{id:'contact',kind:'EMAIL',value:'ana@example.com'}],links:[]}
it('F21-C01 publishing waits for persistence and prevents duplicate submissions',async()=>{
 let finish!:(value:unknown)=>void;request.mockImplementation((path:string)=>path==='/media-kit'?Promise.resolve(data):new Promise(resolve=>{finish=resolve}));render(<MediaKitScreen/>);const publish=await screen.findByRole('button',{name:'Publicar apresentação'});await waitFor(()=>expect((publish as HTMLButtonElement).disabled).toBe(false));fireEvent.click(publish);fireEvent.click(publish);expect(request.mock.calls.filter(([path])=>path==='/media-kit/publish')).toHaveLength(1);expect(screen.queryByText('Apresentação publicada.')).toBeNull();finish({...data,publishedVersion:1,changed:false});await screen.findByText('Apresentação publicada.')
})
it('F21-C02 failures recover, consent defaults off and hidden fields never render',async()=>{
 request.mockRejectedValueOnce(new Error('Sem conexão.')).mockImplementation((path:string)=>Promise.resolve(path==='/media-kit/preview'?{restricted:true}:{...data,privateSecret:'PRIVATE-SENTINEL'}));render(<MediaKitScreen/>);await screen.findByRole('alert');fireEvent.click(screen.getByRole('button',{name:'Tentar de novo'}));fireEvent.click(await screen.findByRole('button',{name:'Configurar apresentação'}));const contact=await screen.findByRole('checkbox',{name:'Publicar e-mail ana@example.com'});expect((contact as HTMLInputElement).checked).toBe(false);expect(document.body.innerHTML).not.toContain('PRIVATE-SENTINEL')
})
