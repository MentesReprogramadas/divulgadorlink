'use client'
import {useState} from 'react'
import { Skeleton, SkeletonRegion } from '@/components/feedback/skeleton'
import styles from './profiles.module.css'
import groups from './profile-groups.module.css'
import { ProfileEditorToolbar } from './profile-editor-toolbar'
import overview from './profile-overview.module.css'
import type { ProfileEditorSection } from '../profile-editor-section'
import { emptyProfile } from '../profile-contract'
import { ProfileFields } from './profile-fields'
import { ProfileAppearanceEditor } from './profile-appearance-editor'
import {ProfileGroupActions} from './profile-group-actions'

export function ProfilePageSkeleton({section='overview'}:{section?:ProfileEditorSection}={}) {
  return <div className={styles.editor}><ProfileEditorSkeleton section={section}/></div>
}

export function ProfileEditorSkeleton({section='overview'}:{section?:ProfileEditorSection}={}) {
  const [primary,setPrimary]=useState<HTMLDivElement|null>(null),[secondary,setSecondary]=useState<HTMLDivElement|null>(null)
  return <SkeletonRegion>
    <ProfileEditorToolbar groupPrimaryRef={setPrimary} groupOptionsRef={setSecondary} section={section} onSection={()=>{}} pending canSave={false} onAction={()=>{}} onReload={()=>{}} onUnpublish={()=>{}} skeleton/>
    {section==='overview'?<div className={overview.overview}><div className={overview.summary}>{[0,1].map(index=><div key={index} className={overview.card}><Skeleton width="50%" height={24}/><Skeleton width="70%" height={32}/><Skeleton width="100%" height={44}/></div>)}</div><Skeleton width="50%" height={28}/><div className={overview.grid}>{[0,1,2,3,4,5].map(index=><div key={index} className={overview.shortcut}><Skeleton width={40} height={40}/><Skeleton width="70%" height={40}/></div>)}</div></div>:null}
    {section==='identity'?<div className={styles.formFrame}><fieldset disabled className={styles.controls}><ProfileFields content={emptyProfile()} onChange={()=>{}} published={false} catalog={[]} onPhoto={()=>{}} step={0}/></fieldset></div>:section==='appearance'?<fieldset disabled className={styles.controls}><ProfileAppearanceEditor content={emptyProfile()} onChange={()=>{}}/></fieldset>:section==='groups'?<div className={styles.groupsFrame} data-layout="profile-form"><div className={groups.manager}><ProfileGroupActions hosts={{primary,secondary}} canChoosePrimary={false} pending onPrimary={()=>{}} onNewGroup={()=>{}}/><div className={groups.grid}>{[0, 1, 2].map(index => <div key={index} className={groups.card}><div className={groups.cardTop}><Skeleton width={56} height={24} /><Skeleton width={44} height={44} /></div><Skeleton width="70%" height={24} /><Skeleton width="50%" height={24} /><Skeleton width="30%" height={44} /></div>)}</div></div></div>:null}
  </SkeletonRegion>
}
