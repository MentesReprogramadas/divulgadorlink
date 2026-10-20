import {cache} from 'react'
import {cookies,headers} from 'next/headers'
import {forward,tenantHost} from '@/lib/upstream'
import type {PublicMediaKit} from '../media-kit-contract'
export const loadMediaKit=cache(async(slug:string):Promise<PublicMediaKit|null>=>{const h=await headers(),jar=await cookies(),response=await forward({method:'GET',path:'/api/v1/profiles/'+encodeURIComponent(slug)+'/media-kit',host:tenantHost(h.get('host')??'localhost'),cookie:jar.get('age')?.value==='yes'?'age=yes':undefined,timeoutMs:15000});if(response.status===404||response.status===400)return null;if(response.status!==200)throw new Error('Não foi possível carregar o mídia kit.');return JSON.parse(response.body.toString()) as PublicMediaKit})
