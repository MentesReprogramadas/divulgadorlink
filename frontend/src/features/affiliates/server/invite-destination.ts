import type { NextRequest } from 'next/server'
import { publicHost } from '@/domain/crawler-policy'

export async function loadAffiliateInviteDestination(request:NextRequest):Promise<string|null> {
  const slug=/^\/ofertas\/entrar\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/.exec(request.nextUrl.pathname)?.[1]
  const agent=request.headers.get('user-agent')??''
  if(!slug||slug.length>80||request.method!=='GET'||request.cookies.has('supportSession')||request.headers.get('sec-fetch-dest')!=='document'||request.headers.get('sec-fetch-mode')!=='navigate'||!/^Mozilla\//.test(agent)||/bot|crawler|spider|headless|playwright|facebookexternalhit|meta-external|WhatsApp\//i.test(agent)||request.headers.has('next-router-prefetch')||/prefetch|prerender/i.test((request.headers.get('purpose')??'')+' '+(request.headers.get('sec-purpose')??'')))return null
  try {
    // Server fetch rewrites Host and Sec-Fetch-Mode; preserve validated browser metadata separately.
    const tenant=publicHost(process.env.TENANT_HOST||request.headers.get('host')||request.nextUrl.hostname)
    const headers=new Headers({host:tenant,'x-affiliate-tenant-host':tenant,'user-agent':agent,'sec-fetch-dest':'document','sec-fetch-mode':'navigate','x-affiliate-fetch-mode':'navigate','x-workspace-owner':'self'})
    for(const name of ['cookie','dnt','sec-gpc','x-analytics-test','x-test-traffic']){const value=request.headers.get(name);if(value)headers.set(name,value)}
    const response=await fetch(new URL('/api/v1/public/affiliates/'+encodeURIComponent(slug)+'/destination?eventId='+crypto.randomUUID(),process.env.API_ORIGIN||'http://127.0.0.1:3333'),{method:'GET',headers,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(4000)})
    if(!response.ok)return null
    const result=await response.json() as {url?:unknown}
    if(typeof result.url!=='string'||!/^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]{16,64}$/.test(result.url))return null
    return result.url
  } catch {return null}
}
