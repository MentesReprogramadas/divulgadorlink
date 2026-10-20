import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {ProfileExportScreen} from './profile-export-screen'
import {emptyProfile} from './profile-contract'
const {request}=vi.hoisted(()=>({request:vi.fn()}))
vi.mock('./profile-api',async importOriginal=>({...await importOriginal<typeof import('./profile-api')>(),profileRequest:request}))
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.resetAllMocks()})
it('um arquivo grande mostra erro no upload sem disparar um download ou uma importação',async()=>{
 render(<ProfileExportScreen/>);const file=new File([new Uint8Array(900001)],'grande.json',{type:'application/json'});
 fireEvent.change(screen.getByLabelText('Arquivo da página'),{target:{files:[file]}});
 await screen.findByText('Escolha um arquivo de até 900 KB.');expect(request).not.toHaveBeenCalled();expect(screen.queryByRole('button',{name:'Tentar de novo'})).toBeNull();expect(screen.getByLabelText('Arquivo da página').getAttribute('aria-invalid')).toBe('true')
})
it('confirma o conteúdo antes de substituir e preserva o expectedVersion recebido do servidor',async()=>{
 const file=new File(['{}'],'pagina.json',{type:'application/json'});Object.defineProperty(file,'text',{value:()=>Promise.resolve('{}')});
 request.mockResolvedValueOnce({content:{...emptyProfile(),name:'Página salva'},expectedVersion:7}).mockResolvedValueOnce({});render(<ProfileExportScreen/>);
 fireEvent.change(screen.getByLabelText('Arquivo da página'),{target:{files:[file]}});await screen.findByRole('dialog',{name:'Importar página'});expect(request).toHaveBeenCalledTimes(1);expect(screen.getByText('A foto atual será removida.')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Importar e substituir'}));await screen.findByText('Página importada para edição. Confira antes de publicar.');expect(request).toHaveBeenLastCalledWith('/backup/import',{method:'POST',body:JSON.stringify({backup:{},expectedVersion:7})})
})
it('F38-C01 pending action prevents duplicate requests and errors are recoverable without false success',async()=>{
 let reject!:(reason:Error)=>void;request.mockImplementationOnce(()=>new Promise((_r,no)=>{reject=no}))
 render(<ProfileExportScreen/>);expect(screen.getByRole('heading',{name:'Importar uma página'})).toBeTruthy();expect(screen.queryByText(/Versão para exportar/)).toBeNull()
 const button=screen.getByRole('button',{name:'Baixar arquivo'});fireEvent.click(button);fireEvent.click(button);expect(request).toHaveBeenCalledTimes(1);expect(screen.queryByRole('status')).toBeNull()
 reject(new Error('Sem conexão.'));await screen.findByText('Sem conexão.');expect(screen.queryByRole('status')).toBeNull();expect((screen.getByRole('button',{name:'Baixar arquivo'}) as HTMLButtonElement).disabled).toBe(false)
 request.mockRejectedValueOnce(new Error('Salve sua página.'));fireEvent.click(screen.getByRole('button',{name:'Tentar de novo'}));await waitFor(()=>expect(request).toHaveBeenCalledTimes(2));await screen.findByText('Salve sua página.')
})
it('F38-C02 loading composition retains controls and cannot export',()=>{
 render(<ProfileExportScreen pendingOnly/>);expect((screen.getByRole('button',{name:'Baixar arquivo'}) as HTMLButtonElement).disabled).toBe(true);fireEvent.click(screen.getByRole('button',{name:'Baixar arquivo'}));expect(request).not.toHaveBeenCalled();expect(screen.getByRole('combobox',{name:'O que deseja baixar?'})).toBeTruthy()
})

it('F38-C01 creates a JSON download only after a successful server response',async()=>{
 Object.defineProperty(URL,'createObjectURL',{value:vi.fn(()=> 'blob:export-fixture'),configurable:true});Object.defineProperty(URL,'revokeObjectURL',{value:vi.fn(),configurable:true})
 const click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>undefined)
 request.mockResolvedValue({schemaVersion:1,categories:[],items:[]});render(<ProfileExportScreen/>);fireEvent.click(screen.getByRole('button',{name:'Baixar arquivo'}));await screen.findByText('Arquivo preparado. Confira os downloads do navegador.');expect(click).toHaveBeenCalledTimes(1);expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));expect(request).toHaveBeenCalledWith('/export?revision=draft',{cache:'no-store'})
})
