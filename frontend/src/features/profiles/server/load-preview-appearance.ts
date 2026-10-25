import {cookies,headers} from 'next/headers'
import {forward,tenantHost} from '@/lib/upstream'
import type {ProfileSearchPage} from '../profile-search-contract'

export async function loadPreviewAppearance(profileTarget?:string) {
  const jar=await cookies(),h=await headers()
  if(!jar.has('accessToken')&&!jar.has('supportSession'))return undefined
  try {
    const response=await forward({method:'GET',path:'/api/v1/me/profile/preview/items',host:tenantHost(h.get('host')??'localhost'),cookie:jar.toString(),workspaceTarget:jar.get('workspaceOwner')?.value??'self',profileTarget,timeoutMs:10000})
    if(response.status!==200)return undefined
    const profile=JSON.parse(response.body.toString()) as ProfileSearchPage
    return profile.restricted?undefined:profile.appearance
  } catch { return undefined } // The existing session gate and preview retain error/retry handling.
}
