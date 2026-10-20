import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {NicheFollowsScreen} from './niche-follows-screen'
const {request}=vi.hoisted(()=>({request:vi.fn()}))
vi.mock('@/lib/api',()=>({api:request}))
afterEach(()=>{cleanup();vi.resetAllMocks()})
const state={preferences:{emailDigest:false,frequency:'WEEKLY',expectedVersion:0,nextDigestAt:null},niches:[{id:'estudos',name:'Estudos',followed:false}]}
it('F05-C01 follow does not opt into emails and duplicate actions await server confirmation',async()=>{
 let finish!:(value:unknown)=>void;request.mockResolvedValueOnce({status:200,body:state}).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve}))
 render(<NicheFollowsScreen/>);await screen.findByRole('button',{name:'Seguir Estudos'});fireEvent.click(screen.getByRole('button',{name:'Seguir Estudos'}));fireEvent.click(screen.getByRole('button',{name:'Seguir Estudos'}));expect(request).toHaveBeenCalledTimes(2);expect(request.mock.calls[1][1].method).toBe('PUT');expect(screen.queryByRole('button',{name:'Deixar de seguir Estudos'})).toBeNull();finish({status:200,body:{...state,niches:[{...state.niches[0],followed:true}]}});await screen.findByRole('button',{name:'Deixar de seguir Estudos'});expect(screen.getByText('Resumos por e-mail desativados')).toBeTruthy()
})
it('F05-C02 private errors are recoverable without dumping server data',async()=>{
 request.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({status:200,body:{...state,niches:[],privateSecret:'F05-SECRET'}});render(<NicheFollowsScreen/>);await screen.findByRole('alert');fireEvent.click(screen.getByRole('button',{name:'Tentar de novo'}));await waitFor(()=>expect(request).toHaveBeenCalledTimes(2));await screen.findByText('Nenhuma categoria disponível.');expect(document.body.textContent).not.toContain('F05-SECRET')
})

it('enabling defaults to checked but waits for confirmation; quick disabling does not open a dialog',async()=>{
 request.mockResolvedValueOnce({status:200,body:state}).mockResolvedValueOnce({status:200,body:{...state,preferences:{...state.preferences,emailDigest:true,expectedVersion:1}}}).mockResolvedValueOnce({status:200,body:{...state,preferences:{...state.preferences,expectedVersion:2}}})
 render(<NicheFollowsScreen/>);fireEvent.click(await screen.findByRole('button',{name:'Ativar resumos'}));expect((screen.getByRole('checkbox',{name:'Receber novidades das categorias que sigo'}) as HTMLInputElement).checked).toBe(true);expect(request).toHaveBeenCalledTimes(1);fireEvent.click(screen.getByRole('button',{name:'Salvar preferência'}));fireEvent.click(await screen.findByRole('button',{name:'Desativar resumos'}));await screen.findByText('Resumos desativados.');expect(screen.queryByRole('dialog',{name:'Resumo por e-mail'})).toBeNull();expect(JSON.parse(request.mock.calls[2][1].body).emailDigest).toBe(false)
})
