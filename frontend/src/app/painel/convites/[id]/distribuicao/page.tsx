import {privateMetadata} from '@/domain/crawler-policy'
import {PoolScreen} from '@/features/redirect-pools/pool-screen'
export const metadata={...privateMetadata,title:'Distribuir acessos | Tem Link Aqui'}
export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{configurar?:string}>}){return <PoolScreen id={(await params).id} startOpen={(await searchParams).configurar==='1'}/> }
