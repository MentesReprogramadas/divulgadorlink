import { loadCatalog } from '@/lib/catalog-page'
import { buildEarlyAffiliateInviteScript } from '../early-invite'

export async function loadEarlyAffiliateInvite(input:{pathname:string;nonce:string|null;personalHost:boolean;support:boolean}):Promise<{nonce:string;script:string}|null> {
  if(!input.nonce||input.personalHost||input.support)return null
  const slug=/^\/ofertas\/entrar\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/.exec(input.pathname)?.[1]
  if(!slug||slug.length>80)return null
  try {
    const result=await loadCatalog('/api/v1/public/affiliates/'+encodeURIComponent(slug))
    const body=result.body as {available?:boolean;joinMode?:string}|null
    if(result.status!==200||body?.available!==true||body.joinMode==='SCREEN')return null
    return {nonce:input.nonce,script:buildEarlyAffiliateInviteScript(slug)}
  } catch {return null}
}
