import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {TeamScreen,type TeamState} from './team-screen'
const {request}=vi.hoisted(()=>({request:vi.fn()}))
vi.mock('@/features/profiles/profile-api',()=>({profileRequest:request}))
afterEach(()=>{cleanup();vi.resetAllMocks()})
const data:TeamState={resourceId:'profile-a',members:[],invitations:[],shared:[]}
it('F20-C01 invitation waits for confirmation, blocks duplicates and shows token only in creation dialog',async()=>{
 let finish!:(value:unknown)=>void;request.mockImplementation((path:string)=>path==='/team'?Promise.resolve(data):new Promise(resolve=>{finish=resolve}))
 render(<TeamScreen/>);await waitFor(()=>expect((screen.getByRole('button',{name:'Convidar colaborador'}) as HTMLButtonElement).disabled).toBe(false));fireEvent.click(screen.getByRole('button',{name:'Convidar colaborador'}));fireEvent.change(screen.getByLabelText('E-mail de quem vai colaborar'),{target:{value:'ana@example.com'}});fireEvent.submit(screen.getByRole('button',{name:'Criar convite'}).closest('form')!);fireEvent.submit(screen.getByRole('button',{name:'Criar convite'}).closest('form')!);expect(request.mock.calls.filter(([path])=>path==='/invitations')).toHaveLength(1);expect(screen.queryByLabelText('Link do convite')).toBeNull();finish({emailDelivery:'sent',token:'one-time-secret',invitation:{id:'i',role:'EDITOR',status:'PENDING',expiresAt:'2026-10-26'}});await screen.findByLabelText('Link do convite');fireEvent.click(screen.getByRole('button',{name:'Concluir'}));expect(document.body.innerHTML).not.toContain('one-time-secret')
})
it('F20-C02 error recovers, empty owner cannot invite and no hidden data enters the DOM',async()=>{
 request.mockRejectedValueOnce(new Error('Sem conexão.')).mockResolvedValue({...data,resourceId:null,secret:'PRIVATE-SENTINEL'});render(<TeamScreen/>);await screen.findByRole('alert');expect(screen.queryByText('Nenhuma página compartilhada com você.')).toBeNull();expect(screen.queryByText('Nenhum colaborador na sua página.')).toBeNull();expect(screen.queryByRole('link',{name:'Criar minha página'})).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Tentar de novo'}));await screen.findByText('Nenhuma página compartilhada com você.');expect((screen.getByRole('button',{name:'Convidar colaborador'}) as HTMLButtonElement).disabled).toBe(true);expect(document.body.innerHTML).not.toContain('PRIVATE-SENTINEL')
})
it('F20-C03 revocation errors keep dialog open and never announce unconfirmed success',async()=>{
 request.mockImplementation((path:string)=>path==='/team'?Promise.resolve({...data,members:[{id:'m',role:'EDITOR',version:1,user:{name:'Ana'}}]}):Promise.reject(new Error('Conflito de acesso.')));render(<TeamScreen/>);fireEvent.click(await screen.findByRole('button',{name:'Revogar acesso'}));fireEvent.click(screen.getByRole('button',{name:'Confirmar revogação'}));await screen.findByText('Conflito de acesso.');expect(screen.getByRole('dialog',{name:'Revogar acesso'})).toBeTruthy();expect(screen.queryByText('Acesso revogado.')).toBeNull()
})

it('falha de entrega mantém link e avisa sem anunciar e-mail enviado',async()=>{
 request.mockImplementation((path:string)=>Promise.resolve(path==='/team'?data:{token:'secret',emailDelivery:'failed',invitation:{id:'i',role:'EDITOR',status:'PENDING',expiresAt:'2026-10-26'}}))
 render(<TeamScreen/>);fireEvent.click(await screen.findByRole('button',{name:'Convidar colaborador'}));fireEvent.change(screen.getByLabelText('E-mail de quem vai colaborar'),{target:{value:'ana@example.com'}});fireEvent.submit(screen.getByRole('button',{name:'Criar convite'}).closest('form')!);await screen.findByLabelText('Link do convite');expect(screen.getByRole('alert').textContent).toContain('não foi possível enviar');expect(screen.queryByText(/Convite enviado por e-mail/)).toBeNull()
})
