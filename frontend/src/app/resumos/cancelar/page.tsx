import {privateMetadata} from '@/domain/crawler-policy'
import {NicheDigestUnsubscribe} from '@/features/niche-follows/niche-digest-unsubscribe'
export const metadata={...privateMetadata,title:'Cancelar resumos | Tem Link Aqui',referrer:'no-referrer' as const}
export default async function Page({searchParams}:{searchParams:Promise<{token?:string}>}){const {token}=await searchParams;return <NicheDigestUnsubscribe token={token??''}/>}
