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
import {ProfileEditingLayout} from './profile-editing-layout'
import {ProfileGroupActions} from './profile-group-actions'
import { LiquidLens } from '@/components/ui/liquid-lens'

export function ProfilePageSkeleton({section='overview',collaborative=false}:{section?:ProfileEditorSection;collaborative?:boolean}={}) {
  return <div className={styles.editor}><ProfileEditorSkeleton section={section} collaborative={collaborative}/></div>
}

export function ProfileEditorSkeleton({section='overview',collaborative=false}:{section?:ProfileEditorSection;collaborative?:boolean}={}) {
  const [primary,setPrimary]=useState<HTMLDivElement|null>(null),[secondary,setSecondary]=useState<HTMLDivElement|null>(null)
  return <SkeletonRegion>
    <ProfileEditorToolbar collaborative={collaborative} groupPrimaryRef={setPrimary} groupOptionsRef={setSecondary} section={section} onSection={()=>{}} pending canSave={false} onAction={()=>{}} onReload={()=>{}} onUnpublish={()=>{}} skeleton/>
    <ProfileEditingLayout content={emptyProfile()}>
    {section==='overview'?<div className={overview.overview}><div className={overview.summary}>{[0,1].map(index=><div key={index} className={overview.card}><Skeleton width="50%" height={24}/><Skeleton width="70%" height={32}/><Skeleton width="100%" height={44}/><LiquidLens radius={16} /></div>)}</div></div>:null}
    {section==='identity'||section==='search'?<div className={styles.formFrame}><fieldset disabled className={styles.controls}><ProfileFields content={emptyProfile()} onChange={()=>{}} published={false} catalog={[]} onPhoto={()=>{}} step={section==='search'?3:0}/></fieldset><LiquidLens radius={16} /></div>:section==='appearance'?<fieldset disabled className={styles.controls}><ProfileAppearanceEditor content={emptyProfile()} onChange={()=>{}}/></fieldset>:section==='groups'?<div className={styles.groupsFrame} data-layout="profile-form"><div className={groups.manager}><ProfileGroupActions hosts={{primary,secondary}} canChoosePrimary={false} pending onPrimary={()=>{}} onNewGroup={()=>{}}/><div className={groups.grid}>{[0, 1, 2].map(index => <div key={index} className={groups.card}><div className={groups.cardTop}><Skeleton width={56} height={24} /><Skeleton width={44} height={44} /></div><Skeleton width="70%" height={24} /><Skeleton width="50%" height={24} /><Skeleton width="30%" height={44} /><LiquidLens radius={16} /></div>)}</div></div></div>:null}
    {section==='contact'||section==='discovery'?<div className={styles.formFrame}><Skeleton width="65%" height={28}/><Skeleton width="90%" height={24}/><Skeleton height={48}/><Skeleton width="45%" height={44}/><LiquidLens radius={16} /></div>:null}
    </ProfileEditingLayout>
  </SkeletonRegion>
}
