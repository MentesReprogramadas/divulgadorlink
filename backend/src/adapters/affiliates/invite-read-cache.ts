import { createHash } from 'node:crypto'
import type Redis from 'ioredis'
import { env } from '@/env'
import { createRedis } from '@/lib/redis'

export interface AffiliateInviteReadCache {
  get(key:string):Promise<string|null>
  set(key:string,value:string,ttlSeconds:number):Promise<void>
}
type CacheRedis = {status:string;get(key:string):Promise<string|null>;set(key:string,value:string,mode:'EX',ttl:number):Promise<unknown>}
let client:Redis|undefined

export function createAffiliateInviteReadCache(scope:string,connection:CacheRedis):AffiliateInviteReadCache {
  const prefix='affiliate:invite-read:v1:'+createHash('sha256').update(scope).digest('hex')+':'
  const key=(value:string)=>prefix+createHash('sha256').update(value).digest('hex')
  return {
    async get(name){if(connection.status!=='ready')return null;try{return await connection.get(key(name))}catch{return null}},
    async set(name,value,ttl){if(connection.status!=='ready')return;try{await connection.set(key(name),value,'EX',ttl)}catch{/* Optional cache must not block an invitation. */}},
  }
}

export function affiliateInviteReadCache(scope:string):AffiliateInviteReadCache|undefined {
  if(env.NODE_ENV==='test')return undefined
  if(!client){
    client=createRedis(env.REDIS_URL,{enableOfflineQueue:false,maxRetriesPerRequest:0,connectTimeout:300,commandTimeout:100})
    client.on('error',()=>{/* Fall back to the provider while Redis reconnects. */})
  }
  return createAffiliateInviteReadCache(scope,client)
}
