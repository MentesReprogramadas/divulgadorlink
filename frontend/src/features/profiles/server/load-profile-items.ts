import {cache} from 'react'
import {cookies,headers} from 'next/headers'
import {forward,tenantHost} from '@/lib/upstream'
import type {ProfileSearchPage} from '../profile-search-contract'
export class ProfileSearchLoadError extends Error{constructor(public readonly status:number,message:string){super(message)}}
export const loadPublicProfileItems=cache(async(slug:string,query:string):Promise<ProfileSearchPage|null>=>{
 const h=await headers(),jar=await cookies(),response=await forward({method:'GET',path:'/api/v1/profiles/'+encodeURIComponent(slug)+'/items'+(query?'?'+query:''),host:tenantHost(h.get('host')??'localhost'),cookie:jar.get('age')?.value==='yes'?'age=yes':undefined,timeoutMs:10000})
 if(response.status===404)return null
 if(response.status!==200)throw new ProfileSearchLoadError(response.status,'Confira os filtros da busca. Os resultados podem ter mudado; tente novamente.')
 return JSON.parse(response.body.toString()) as ProfileSearchPage
})
