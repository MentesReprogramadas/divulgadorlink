import {headers,cookies} from 'next/headers'
import {notFound} from 'next/navigation'
import {forward,tenantHost} from '@/lib/upstream'
import {Badge} from '@/components/ui/badge'
import type {OwnershipVerification} from '@/features/ownership/ownership-contract'
import styles from '@/features/ownership/ownership.module.css'
export const dynamic='force-dynamic'
export const metadata={title:'Comprovação de domínio | Tem Link Aqui',robots:{index:false,follow:false}}
export default async function Page({params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!/^[a-f0-9-]{36}$/.test(id))notFound()
 const response=await forward({method:'GET',path:'/api/v1/redirects/'+id+'/ownership',host:tenantHost((await headers()).get('host')??'localhost'),cookie:(await cookies()).get('age')?.value==='yes'?'age=yes':undefined,timeoutMs:10000})
 const data=response.status===200?JSON.parse(response.body.toString()) as {verification:OwnershipVerification|null}:null
 return <main><section className={styles.card}><h1>Comprovação de domínio</h1>{data?.verification?<><Badge tone="ok">Controle do domínio comprovado</Badge><strong>{data.verification.domain}</strong><p>Destino: {data.verification.destinationUrl}</p><p>Válida até {new Date(data.verification.expiresAt).toLocaleDateString('pt-BR')}.</p></>:<p>Nenhuma comprovação válida para este destino.</p>}<p>Esta comprovação confirma controle do domínio, sem garantir identidade, qualidade ou segurança.</p></section></main>
}
