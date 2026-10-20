'use client'
import {useEffect,useState} from 'react'
import {ProfilePreviewShell} from '@/features/profiles/components/profile-preview-shell'
import {ProfileView} from '@/features/profiles/components/profile-view'
import {profileRequest} from '@/features/profiles/profile-api'
import {emptyProfile} from '@/features/profiles/profile-contract'
import {SkeletonRegion} from '@/components/feedback/skeleton'
import {ErrorState} from '@/components/feedback/error-state'
import {CampaignView} from './campaign-view'
import type {CampaignPublic} from './campaign-contract'
import styles from './campaign.module.css'
const placeholder={...emptyProfile(),name:'Nome da página',bio:'Descrição da página',categories:[{id:'group',name:'Seus links',visible:true}],items:[0,1,2].map(id=>({id:String(id),categoryId:'group',type:'URL' as const,label:'Nome do link',destination:'https://example.com',visible:true}))}
export function CampaignPreview({id,pendingOnly=false}:{id:string;pendingOnly?:boolean}){
 const [content,setContent]=useState<CampaignPublic|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0)
 useEffect(()=>{if(pendingOnly)return;let current=true;setError('');void profileRequest<CampaignPublic>('/campaigns/'+encodeURIComponent(id)+'/preview').then(value=>{if(current)setContent(value)}).catch(reason=>{if(current)setError(reason instanceof Error?reason.message:'Não foi possível abrir a prévia.')});return()=>{current=false}},[id,pendingOnly,attempt])
 return <ProfilePreviewShell backHref="/painel/perfil/campanhas" backLabel="Voltar às campanhas">{error?<ErrorState message={error} onRetry={()=>setAttempt(value=>value+1)}/>:!content||pendingOnly?<SkeletonRegion label="Carregando prévia da campanha"><div className={styles.publicPending}><ProfileView content={placeholder} pending/></div></SkeletonRegion>:<CampaignView key={id+'-'+attempt} initial={content} slug={content.parentSlug??''} previewId={id}/>}</ProfilePreviewShell>
}
