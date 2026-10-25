'use client'
import {useEffect,useState} from 'react'
import {ProfilePreviewShell} from '@/features/profiles/components/profile-preview-shell'
import {profileRequest} from '@/features/profiles/profile-api'
import {ErrorState} from '@/components/feedback/error-state'
import {MediaKitView} from './media-kit-view'
import {MediaKitPending} from './media-kit-pending'
import type {PublicMediaKit} from './media-kit-contract'
export function MediaKitPreview({pendingOnly=false}:{pendingOnly?:boolean}){const [kit,setKit]=useState<PublicMediaKit|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);useEffect(()=>{if(pendingOnly)return;let current=true;setError('');void profileRequest<PublicMediaKit>('/media-kit/preview').then(value=>{if(current)setKit(value)}).catch(reason=>{if(current)setError(reason instanceof Error?reason.message:'Não foi possível carregar a prévia.')});return()=>{current=false}},[pendingOnly,attempt]);return <ProfilePreviewShell variant={error?'platform':'profile'} backHref="/painel/perfil/midia-kit" backLabel="Voltar à apresentação">{error?<ErrorState message={error} onRetry={()=>setAttempt(value=>value+1)}/>:!kit||pendingOnly?<MediaKitPending/>:<MediaKitView kit={kit} preview/>}</ProfilePreviewShell>}
