import {act,cleanup,renderHook,waitFor} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {useAgencyData} from './use-agency-data'
const mocks=vi.hoisted(()=>({request:vi.fn(),identity:{ownerId:'agency-a',grants:{agency:{read:true,write:true}}}}))
vi.mock('./agency-api',()=>({agencyRequest:mocks.request}))
vi.mock('@/features/workspace-team/workspace-access',()=>({useWorkspaceIdentity:()=>mocks.identity}))
beforeEach(()=>{mocks.request.mockReset();mocks.identity.ownerId='agency-a'})
afterEach(cleanup)
it('F36-U02 resposta atrasada não mistura clientes e cada request fixa o espaço correto',async()=>{
 let finishA!:(value:{name:string})=>void,finishB!:(value:{name:string})=>void
 mocks.request.mockImplementationOnce(()=>new Promise(resolve=>{finishA=resolve})).mockImplementationOnce(()=>new Promise(resolve=>{finishB=resolve}))
 const hook=renderHook(()=>useAgencyData<{name:string}>('/clients'));const oldLoad=hook.result.current.load
 mocks.identity.ownerId='agency-b';hook.rerender();expect(hook.result.current.data).toBeNull();await act(async()=>finishB({name:'Cliente B'}));expect(hook.result.current.data?.name).toBe('Cliente B');await act(async()=>finishA({name:'PRIVATE_CLIENT_A'}));expect(hook.result.current.data?.name).toBe('Cliente B')
 await act(async()=>{expect(await oldLoad()).toBe(false)});expect(mocks.request).toHaveBeenCalledTimes(2);expect(mocks.request.mock.calls.map(([,init])=>init.headers['x-workspace-owner'])).toEqual(['agency-a','agency-b'])
})
it('F36-C02 acesso revogado elimina o resultado anterior; erro de rede preserva o resultado para recuperar',async()=>{
 mocks.request.mockResolvedValueOnce({name:'Cliente A'});const hook=renderHook(()=>useAgencyData<{name:string}>('/clients'));await waitFor(()=>expect(hook.result.current.data?.name).toBe('Cliente A'));mocks.request.mockRejectedValueOnce(new Error('Sem conexão'));await act(async()=>{await hook.result.current.load()});expect(hook.result.current.data?.name).toBe('Cliente A');expect(hook.result.current.error).toBe('Sem conexão')
 mocks.request.mockRejectedValueOnce(Object.assign(new Error('Acesso removido'),{status:403}));await act(async()=>{await hook.result.current.load()});expect(hook.result.current.data).toBeNull();expect(hook.result.current.loading).toBe(false);expect(hook.result.current.error).toBe('Acesso removido')
})
it('F36-C03 recibos pessoais usam a conta real mesmo dentro de outro espaço',async()=>{mocks.request.mockResolvedValue({requests:[]});renderHook(()=>useAgencyData('/transfers',true));await waitFor(()=>expect(mocks.request).toHaveBeenCalled());expect(mocks.request.mock.calls[0][1].headers['x-workspace-owner']).toBe('self');expect(mocks.request.mock.calls[0][2]).toBe(true)})
