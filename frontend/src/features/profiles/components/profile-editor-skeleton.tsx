'use client'
import { Skeleton, SkeletonRegion } from '@/components/feedback/skeleton'
import { TabNavigation } from '@/components/ui/tabs'
import styles from './profiles.module.css'
import groups from './profile-groups.module.css'
import { Button } from '@/components/ui/button'
import { ActionIcon } from '@/components/ui/action-icon'
import { profileEditorActions } from '../profile-editor-actions'
import type { ProfileEditorSection } from '../profile-editor-section'
import { emptyProfile } from '../profile-contract'
import { ProfileFields } from './profile-fields'
import { ProfileAppearanceEditor } from './profile-appearance-editor'
import {ProfileGroupActions} from './profile-group-actions'

export function ProfilePageSkeleton({section='groups'}:{section?:ProfileEditorSection}={}) {
  return <div className={styles.editor}><ProfileEditorSkeleton section={section}/></div>
}

export function ProfileEditorSkeleton({section='groups'}:{section?:ProfileEditorSection}={}) {
  return <SkeletonRegion>
    <div className={styles.editorTools}><div className={styles.toolsActions}>{profileEditorActions.filter(tool=>tool.id!=='preview').map(tool=><Button key={tool.id} variant={tool.variant} disabled><ActionIcon name={tool.icon}/>{tool.label}</Button>)}<Skeleton width={44} height={44}/></div><div className={styles.simpleNavigation}><TabNavigation value={section} label="Seções da minha página" idPrefix="page-editor-pending" items={[{ id: 'groups', label: 'Grupos e links' }, { id: 'identity', label: 'Página' }, { id: 'appearance', label: 'Aparência' }]} /></div><Button variant="primary" disabled><ActionIcon name="preview"/>Ver prévia</Button></div>
    {section==='identity'?<div className={styles.formFrame}><fieldset disabled className={styles.controls}><ProfileFields content={emptyProfile()} onChange={()=>{}} published={false} catalog={[]} onPhoto={()=>{}} step={0}/></fieldset></div>:section==='appearance'?<fieldset disabled className={styles.controls}><ProfileAppearanceEditor content={emptyProfile()} onChange={()=>{}}/></fieldset>:<div className={styles.groupsFrame} data-layout="profile-form"><div className={groups.manager}><ProfileGroupActions canChoosePrimary={false} pending onChannels={()=>{}} onPrimary={()=>{}} onNewGroup={()=>{}}/><div className={groups.grid}>{[0, 1, 2].map(index => <div key={index} className={groups.card}><div className={groups.cardTop}><Skeleton width={56} height={24} /><Skeleton width={44} height={44} /></div><Skeleton width="70%" height={24} /><Skeleton width="50%" height={24} /><Skeleton width="30%" height={44} /></div>)}</div></div></div>}
  </SkeletonRegion>
}
