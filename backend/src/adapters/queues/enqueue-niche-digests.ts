import {Queue} from 'bullmq'
import {createRedis} from '@/lib/redis'
import {env} from '@/env'
export const NICHE_DIGEST_QUEUE='divulgador-niche-digests'
let queue:Queue|null=null
export async function enqueueNicheDigestCycle(){
 if(env.NODE_ENV==='test')return
 queue??=new Queue(NICHE_DIGEST_QUEUE,{connection:createRedis(env.REDIS_URL,{maxRetriesPerRequest:null})})
 await queue.add('niche-digest-cycle',{},{jobId:'niche-digest-cycle',removeOnComplete:true,removeOnFail:100,attempts:3,backoff:{type:'exponential',delay:5000}})
}
