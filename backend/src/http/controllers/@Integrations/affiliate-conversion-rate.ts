import { createHash } from 'node:crypto'

// Sliding window like login/traffic counters, bounded without clearing active limits under churn.
export function createConversionRateLimiter(now:()=>number=Date.now) {
  const attempts=new Map<string,number[]>()
  return (ip:string,tenantId:string,slug:string)=>{
    const at=now(),windowMs=60_000
    for(const [key,stamps] of attempts)if(stamps[stamps.length-1]<=at-windowMs)attempts.delete(key)
    const key=createHash('sha256').update(JSON.stringify([ip,tenantId,slug])).digest('hex')
    const recent=(attempts.get(key)??[]).filter(stamp=>stamp>at-windowMs)
    if(recent.length>=20||(!attempts.has(key)&&attempts.size>=10000))return true
    recent.push(at);attempts.set(key,recent)
    return false
  }
}
