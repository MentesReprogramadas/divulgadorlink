import {afterEach,expect,it,vi} from 'vitest'
import {loadPreviewAppearance} from './load-preview-appearance'
const state=vi.hoisted(()=>({authenticated:true,forward:vi.fn()}))
vi.mock('next/headers',()=>({headers:async()=>new Headers({host:'tenant.test'}),cookies:async()=>({has:()=>state.authenticated,get:(name:string)=>name==='workspaceOwner'?{value:'owner'}:undefined,toString:()=> 'accessToken=fixture'})}))
vi.mock('@/lib/upstream',()=>({tenantHost:(host:string)=>host,forward:state.forward}))
afterEach(()=>{vi.resetAllMocks();state.authenticated=true})
it('pede o tema somente ao backend autenticado mantendo seletores como contexto não confiável',async()=>{
 state.forward.mockResolvedValue({status:200,body:Buffer.from(JSON.stringify({restricted:false,appearance:{background:'#ece5ff'}}))})
 expect(await loadPreviewAppearance('shared')).toEqual({background:'#ece5ff'})
 expect(state.forward).toHaveBeenCalledWith(expect.objectContaining({cookie:'accessToken=fixture',workspaceTarget:'owner',profileTarget:'shared',host:'tenant.test',path:'/api/v1/me/profile/preview/items'}))
})
it('não busca sem sessão nem revela tema negado, restrito ou com falha',async()=>{
 state.authenticated=false;expect(await loadPreviewAppearance()).toBeUndefined();expect(state.forward).not.toHaveBeenCalled()
 state.authenticated=true
 for(const response of [{status:403,body:Buffer.from('{}')},{status:200,body:Buffer.from('{"restricted":true}')}]){state.forward.mockResolvedValueOnce(response);expect(await loadPreviewAppearance()).toBeUndefined()}
 state.forward.mockRejectedValueOnce(new Error('offline'));expect(await loadPreviewAppearance()).toBeUndefined()
})
