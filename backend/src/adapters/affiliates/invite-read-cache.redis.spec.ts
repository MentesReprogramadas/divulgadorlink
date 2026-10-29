import { randomUUID } from 'node:crypto'
import Redis from 'ioredis'
import { expect, it, vi } from 'vitest'
import { createAffiliateInviteReadCache } from './invite-read-cache'

const url=process.env.INVITE_CACHE_REDIS_URL
it.skipIf(!url)('expira o convite no Redis real e isola versões da conexão',async()=>{
  if(!url||!['localhost','127.0.0.1'].includes(new URL(url).hostname))throw new Error('Disposable local INVITE_CACHE_REDIS_URL required')
  const client=new Redis(url,{maxRetriesPerRequest:0,connectTimeout:500,commandTimeout:500})
  try{
    await client.ping()
    const scope=randomUUID(),cache=createAffiliateInviteReadCache(scope,client),changed=createAffiliateInviteReadCache(scope+':new-version',client)
    await cache.set('invite:123@g.us','https://chat.whatsapp.com/AbCdEf0123456789AbCdEf',1)
    expect(await cache.get('invite:123@g.us')).toContain('chat.whatsapp.com')
    expect(await changed.get('invite:123@g.us')).toBeNull()
    await vi.waitFor(async()=>expect(await cache.get('invite:123@g.us')).toBeNull(),{timeout:2500,interval:100})
  }finally{await client.quit()}
})
