import { headers, cookies } from 'next/headers'
import { forward, tenantHost } from '@/lib/upstream'
import { DiscoveryScreen } from '@/features/profile-discovery/discovery-screen'
import type { DirectoryResult } from '@/features/profile-discovery/discovery-api'
import styles from '@/features/profile-discovery/discovery.module.css'
export const metadata = { title: 'Descobrir páginas | Tem Link Aqui', robots: { index: false, follow: true } }
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const h=await headers(),jar=await cookies()
  const values=await searchParams,q=typeof values.q==='string'?values.q:'',nicheId=typeof values.nicheId==='string'?values.nicheId:''
  const query=new URLSearchParams();if(q)query.set('q',q);if(nicheId)query.set('nicheId',nicheId)
  const response=await forward({method:'GET',path:'/api/v1/profiles'+(query.size?'?'+query.toString():''),host:tenantHost(h.get('host')??'localhost'),cookie:jar.get('age')?.value==='yes'?'age=yes':undefined,timeoutMs:10000})
  if(response.status!==200)throw new Error('Não foi possível carregar as páginas. Tente novamente.')
  return <main className={styles.shell}><h1>Descobrir páginas</h1><DiscoveryScreen initial={JSON.parse(response.body.toString()) as DirectoryResult} query={q} nicheId={nicheId}/></main>
}
