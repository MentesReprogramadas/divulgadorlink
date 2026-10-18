import {expect,it} from 'vitest'
import {readProfileInteraction,signProfileInteraction,PROFILE_MEASUREMENT_TOKEN_MS} from './profile-interaction-token'
const context={tenantId:'tenant-a',profileId:'12345678-1234-4234-8234-123456789abc',revisionId:3},secret='local-purpose-secret',now=new Date('2026-10-18T12:00:00Z')
it('F31-I01 token binds the real profile, tenant and published revision and expires at the exact boundary',()=>{
 const token=signProfileInteraction(context,secret,now)
 expect(readProfileInteraction(token,context,secret,now)).toBe(true)
 for(const patch of [{tenantId:'tenant-b'},{revisionId:4},{profileId:'22345678-1234-4234-8234-123456789abc'}])expect(readProfileInteraction(token,{...context,...patch},secret,now)).toBe(false)
 expect(readProfileInteraction(token,context,secret,new Date(+now+PROFILE_MEASUREMENT_TOKEN_MS))).toBe(false)
 expect(readProfileInteraction(token+'tampered',context,secret,now)).toBe(false)
 expect(readProfileInteraction(token,context,'other secret',now)).toBe(false)
})
