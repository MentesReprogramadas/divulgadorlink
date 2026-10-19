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
