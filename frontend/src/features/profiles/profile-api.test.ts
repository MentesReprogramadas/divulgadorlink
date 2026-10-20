import {afterEach,expect,it,vi} from 'vitest'
import {managedProfileId,profileRequest,profileScope,profileWorkspacePath} from './profile-api'
const {api}=vi.hoisted(()=>({api:vi.fn()}))
vi.mock('@/lib/api',()=>({api}))
afterEach(()=>{vi.resetAllMocks();window.history.replaceState(null,'','/')})
it('F20 resource context is explicit and stable; location alone never redirects a pending owner write',async()=>{api.mockResolvedValue({status:200,body:{ok:true}});window.history.replaceState(null,'','/painel/equipe/another-resource/editar');await profileRequest('',{method:'PATCH',body:'{}'});expect(api.mock.calls[0][1].headers).toBeUndefined();await profileRequest('',profileScope({method:'PATCH',body:'{}'},'original-resource'));expect(api.mock.calls[1][1].headers['x-profile-id']).toBe('original-resource');expect(profileWorkspacePath('previa','original-resource')).toBe('/painel/equipe/original-resource/previa')})
it('F20 malformed shared resource remains a selector for server denial instead of silently opening own profile',()=>{window.history.replaceState(null,'','/painel/equipe/not-an-id/editar');expect(managedProfileId()).toBe('not-an-id');expect(profileScope(undefined,managedProfileId())?.headers).toEqual({'x-profile-id':'not-an-id'})})
