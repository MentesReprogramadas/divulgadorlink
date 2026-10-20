import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {InteractionPolicy} from '@/components/ui/interaction-policy'
import {emptyProfile,type ProfileState} from '@/features/profiles/profile-contract'
import {ShareKitScreen} from './share-kit-screen'
import type {ShareKitArtifact} from './render-share-kit'
import type {ShareKitPlan} from './share-kit-plan'
const {request,generate,download}=vi.hoisted(()=>({request:vi.fn(),generate:vi.fn(),download:vi.fn()}))
vi.mock('@/features/profiles/profile-api',()=>({profileRequest:request}))
vi.mock('./share-kit-api',()=>({readShareKitState:()=>request('')}))
vi.mock('./render-share-kit',()=>({renderShareKit:generate}))
vi.mock('@/lib/download-blob',()=>({downloadBlob:download}))
const content={...emptyProfile(),slug:'ana',name:'Página publicada',bio:'Texto público'},state:ProfileState={draft:{...content,version:2,name:'private-sentinel'},publishedContent:content,publishedVersion:1}
beforeEach(()=>{vi.stubGlobal('URL',class extends URL{static revokeObjectURL=vi.fn()});request.mockResolvedValue(state);generate.mockImplementation(async plan=>({plan,blob:new Blob(['image'],{type:'image/png'}),filename:'post.png',preview:'blob:preview-fixture'}))})
afterEach(()=>{cleanup();vi.useRealTimers();vi.resetAllMocks();vi.unstubAllGlobals()})
it('F32-C01/T01 exige prévia atual e preserva personalização após falha; leitura permite gerar sem gravar página',async()=>{render(<InteractionPolicy readOnly><ShareKitScreen/></InteractionPolicy>);await waitFor(()=>expect((screen.getByRole('button',{name:'Gerar prévia'}) as HTMLButtonElement).disabled).toBe(false));expect((screen.getByRole('button',{name:'Baixar imagem'}) as HTMLButtonElement).disabled).toBe(true);fireEvent.submit(screen.getByRole('form',{name:'Personalizar arte'}));await screen.findByRole('img',{name:'Prévia da arte: Página publicada'});expect(generate.mock.calls[0][0].title).toBe('Página publicada');expect(screen.queryByText('private-sentinel')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Editar texto'}));fireEvent.change(screen.getByLabelText('Título na imagem'),{target:{value:'Novo título'}});expect((screen.getByRole('button',{name:'Baixar imagem'}) as HTMLButtonElement).disabled).toBe(true);generate.mockRejectedValueOnce(new Error('Falha na imagem'));fireEvent.submit(screen.getByRole('form',{name:'Personalizar arte'}));await screen.findByText('Falha na imagem');expect((screen.getByLabelText('Título na imagem') as HTMLInputElement).value).toBe('Novo título');expect(download).not.toHaveBeenCalled();fireEvent.submit(screen.getByRole('form',{name:'Personalizar arte'}));await screen.findByRole('img',{name:'Prévia da arte: Novo título'});expect(request.mock.calls.every(([,init])=>!init)).toBe(true)})
it('F32-C02/T05 ausência de publicação não gera arte com rascunho automaticamente',async()=>{request.mockResolvedValue({...state,publishedContent:null,publishedVersion:null});render(<ShareKitScreen/>);await screen.findByText('Publique sua página para gerar a arte oficial.');expect((screen.getByRole('button',{name:'Gerar prévia'}) as HTMLButtonElement).disabled).toBe(true);expect(generate).not.toHaveBeenCalled();expect(screen.queryByText('private-sentinel')).toBeNull()})
it('F32-C03 estado de carregamento compartilha a composição e não consulta transporte',()=>{render(<ShareKitScreen pendingOnly/>);expect(screen.getByRole('region',{name:'Prévia da arte'}).getAttribute('aria-busy')).toBe('true');expect((screen.getByRole('button',{name:'Gerar prévia'}) as HTMLButtonElement).disabled).toBe(true);expect(request).not.toHaveBeenCalled()})

it('digitação gera apenas após 500 ms sem novas alterações',async()=>{
 render(<ShareKitScreen/>);await waitFor(()=>expect((screen.getByRole('button',{name:'Gerar prévia'}) as HTMLButtonElement).disabled).toBe(false));fireEvent.click(screen.getByRole('button',{name:'Editar texto'}));vi.useFakeTimers();
 fireEvent.change(screen.getByLabelText('Título na imagem'),{target:{value:'Primeiro'}});
 await act(async()=>{await vi.advanceTimersByTimeAsync(300)});expect(generate).not.toHaveBeenCalled();
 fireEvent.change(screen.getByLabelText('Título na imagem'),{target:{value:'Último texto'}});
 await act(async()=>{await vi.advanceTimersByTimeAsync(499)});expect(generate).not.toHaveBeenCalled();
 await act(async()=>{await vi.advanceTimersByTimeAsync(1)});expect(generate).toHaveBeenCalledTimes(1);expect(generate.mock.calls[0][0].title).toBe('Último texto');expect(screen.getByRole('img',{name:'Prévia da arte: Último texto'})).toBeTruthy()
})
it('nova edição durante geração descarta resultado antigo e mantém campos disponíveis',async()=>{
 let finish!:(value:ShareKitArtifact)=>void,oldPlan!:ShareKitPlan;
 generate.mockImplementationOnce((plan:ShareKitPlan)=>{oldPlan=plan;return new Promise<ShareKitArtifact>(resolve=>finish=resolve)});
 render(<ShareKitScreen/>);await waitFor(()=>expect((screen.getByRole('button',{name:'Gerar prévia'}) as HTMLButtonElement).disabled).toBe(false));fireEvent.click(screen.getByRole('button',{name:'Editar texto'}));vi.useFakeTimers();
 fireEvent.change(screen.getByLabelText('Título na imagem'),{target:{value:'Antigo'}});await act(async()=>{await vi.advanceTimersByTimeAsync(500)});
 expect((screen.getByLabelText('Título na imagem') as HTMLInputElement).disabled).toBe(false);expect((screen.getByRole('button',{name:'Personalizar cores'}) as HTMLButtonElement).disabled).toBe(false);
 fireEvent.change(screen.getByLabelText('Título na imagem'),{target:{value:'Atual'}});await act(async()=>{await vi.advanceTimersByTimeAsync(500)});
 expect(screen.getByRole('img',{name:'Prévia da arte: Atual'})).toBeTruthy();
 await act(async()=>{finish({plan:oldPlan,blob:new Blob(['old']),filename:'old.png',preview:'blob:old'});await Promise.resolve()});
 expect(screen.getByRole('img',{name:'Prévia da arte: Atual'})).toBeTruthy();expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:old');expect((screen.getByRole('button',{name:'Baixar imagem'}) as HTMLButtonElement).disabled).toBe(false)
})
it('sair da tela cancela a prévia agendada',async()=>{
 const view=render(<ShareKitScreen/>);await waitFor(()=>expect((screen.getByRole('button',{name:'Gerar prévia'}) as HTMLButtonElement).disabled).toBe(false));fireEvent.click(screen.getByRole('button',{name:'Editar texto'}));vi.useFakeTimers();fireEvent.change(screen.getByLabelText('Título na imagem'),{target:{value:'Texto'}});view.unmount();await act(async()=>{await vi.advanceTimersByTimeAsync(1000)});expect(generate).not.toHaveBeenCalled()
})
