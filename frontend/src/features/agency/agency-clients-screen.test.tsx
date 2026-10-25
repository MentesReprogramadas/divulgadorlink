import {cleanup,render,screen} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {AgencyClientsScreen} from './agency-clients-screen'
const mocks=vi.hoisted(()=>({data:{clients:[{id:'one',name:'Marca A',version:0,available:true,role:'VIEWER',profile:{id:'page',name:'Cliente A',slug:'cliente-a',published:true}}],choices:[],used:1,limit:10,personal:false},writable:false,request:vi.fn()}))
vi.mock('./use-agency-data',()=>({useAgencyData:()=>({scope:'self',data:mocks.data,writable:mocks.writable,request:mocks.request,load:vi.fn(),setError:vi.fn(),error:'',loading:false})}))
vi.mock('./agency-sections',()=>({AgencySections:()=>null}))
vi.mock('@/features/workspace-team/workspace-access',()=>({selectWorkspace:vi.fn()}))
afterEach(cleanup)
beforeEach(()=>{mocks.writable=false;mocks.request.mockClear()})
it('F36-C04 leitura permite consultar e abrir métricas sem botões de alteração',()=>{render(<AgencyClientsScreen/>);expect(screen.getByRole('button',{name:'Consultar página'})).toBeTruthy();expect(screen.getByRole('button',{name:'Resultados desta página'})).toBeTruthy();expect(screen.queryByRole('button',{name:'Adicionar página'})).toBeNull();expect(screen.queryByRole('button',{name:'Remover da minha lista'})).toBeNull();expect(mocks.request).not.toHaveBeenCalled()})
