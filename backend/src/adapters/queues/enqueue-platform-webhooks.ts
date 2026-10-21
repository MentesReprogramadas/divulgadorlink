import {Queue} from 'bullmq'
import {createRedis} from '@/lib/redis'
import {env} from '@/env'
export const PLATFORM_WEBHOOK_QUEUE='divulgador-platform-webhooks'
let queue:Queue|null=null
export async function enqueueWebhookCycle(){
 if(env.NODE_ENV==='test'||!env.WEBHOOK_ENCRYPTION_KEY)return
 queue??=new Queue(PLATFORM_WEBHOOK_QUEUE,{connection:createRedis(env.REDIS_URL,{maxRetriesPerRequest:null})})
 await queue.add('platform-webhook-cycle',{}, {jobId:'platform-webhook-cycle',removeOnComplete:true,removeOnFail:100,attempts:3,backoff:{type:'exponential',delay:5000}})
}
