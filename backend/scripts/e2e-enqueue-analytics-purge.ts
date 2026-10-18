import {enqueueAnalyticsPurge} from '../src/adapters/queues/enqueue-analytics-purge'
const redis=new URL(process.env.REDIS_URL??'redis://invalid')
if(process.env.NODE_ENV!=='dev'||!/^f[0-9]+-[a-z0-9-]+$/.test(process.env.E2E_RUN_ID??'')||!['127.0.0.1','localhost'].includes(redis.hostname)||Number(redis.port)<=6380)throw new Error('Only the isolated local E2E queue is permitted')
enqueueAnalyticsPurge().then(()=>process.exit(0)).catch(()=>process.exit(1))
