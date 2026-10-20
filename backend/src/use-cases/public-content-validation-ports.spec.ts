import {expect,it,vi} from 'vitest'

const fixture=vi.hoisted(()=>({mode:'production',probe:vi.fn(async()=>204)}))
vi.mock('@/env',()=>({env:{get NODE_ENV(){return fixture.mode},OPENAI_API_KEY:''}}))
vi.mock('@/adapters/http/availability-probe',()=>({probeAvailability:fixture.probe}))
import {composePublicContentProbeForTest,publicContentValidationPorts} from './public-content-validation-ports'

it('keeps the real probe by default and refuses test composition in production',async()=>{
 const replacement=vi.fn(async()=>200)
 expect(()=>composePublicContentProbeForTest(replacement)).toThrow('production')
 expect(await publicContentValidationPorts('channels.localhost').probe('https://example.com')).toBe(204)
 expect(replacement).not.toHaveBeenCalled()
 fixture.mode='test'
 composePublicContentProbeForTest(replacement)
 expect(await publicContentValidationPorts('channels.localhost').probe('https://example.com')).toBe(200)
 expect(replacement).toHaveBeenCalledWith('https://example.com')
})

it('F15 local campaign fixtures cannot select a stub for production or an unrelated host',async()=>{
 const fetchFixture=vi.fn().mockResolvedValue({ok:true,json:async()=>({pass:true,confidence:.99,reasons:[]})});vi.stubGlobal('fetch',fetchFixture);vi.stubEnv('E2E_PROFILE_STUB_URL','http://127.0.0.1:4099')
 try{fixture.mode='dev';expect((await publicContentValidationPorts('campaigns.localhost').judge({name:'Página',description:'Projeto',niche:'Geral'}))?.pass).toBe(true);expect(fetchFixture).toHaveBeenCalledTimes(1);await expect(publicContentValidationPorts('outside.localhost').judge({name:'Página',description:'Projeto',niche:'Geral'})).rejects.toThrow('indisponível');fixture.mode='production';await expect(publicContentValidationPorts('campaigns.localhost').judge({name:'Página',description:'Projeto',niche:'Geral'})).rejects.toThrow('indisponível');expect(fetchFixture).toHaveBeenCalledTimes(1)}finally{fixture.mode='production';vi.unstubAllGlobals();vi.unstubAllEnvs()}
})
