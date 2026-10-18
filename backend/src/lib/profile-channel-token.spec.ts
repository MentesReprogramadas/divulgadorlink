import {expect,it} from 'vitest'
import {randomUUID} from 'node:crypto'
import {signProfileChannel,readProfileChannel,PROFILE_CHANNEL_TOKEN_MS} from './profile-channel-token'
import {signProfileInteraction} from './profile-interaction-token'
const context={tenantId:'tenant-a',profileId:randomUUID(),revisionId:2,channelId:randomUUID(),destinationRevisionId:randomUUID()},secret='fixture-channel-signing-secret',now=new Date('2026-10-18T12:00:00Z')
it('F37-U05 selection tokens bind tenant, page/version, channel and exact destination revision with expiry',()=>{
 const token=signProfileChannel(context,secret,now);expect(readProfileChannel(token,context,secret,now)).toBe(true)
 for(const changed of [{tenantId:'tenant-b'},{profileId:randomUUID()},{revisionId:3},{channelId:randomUUID()},{destinationRevisionId:randomUUID()}])expect(readProfileChannel(token,{...context,...changed},secret,now)).toBe(false)
 expect(readProfileChannel(token,context,secret,new Date(now.getTime()+PROFILE_CHANNEL_TOKEN_MS))).toBe(false);expect(readProfileChannel(token+'x',context,secret,now)).toBe(false)
 expect(readProfileChannel(signProfileInteraction({tenantId:context.tenantId,profileId:context.profileId,revisionId:context.revisionId},secret,now),context,secret,now)).toBe(false)
 expect(readProfileChannel(token+'.',context,secret,now)).toBe(false);expect(readProfileChannel(token+'$',context,secret,now)).toBe(false)
})
