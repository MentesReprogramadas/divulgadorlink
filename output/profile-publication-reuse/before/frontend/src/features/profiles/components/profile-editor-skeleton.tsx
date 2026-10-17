import { Skeleton, SkeletonButton, SkeletonRegion } from '@/components/feedback/skeleton'
import { TabNavigation } from '@/components/ui/tabs'
import styles from './profiles.module.css'
import groups from './profile-groups.module.css'

export function ProfilePageSkeleton() {
  return <div className={styles.editor}><div className={styles.toolbar}><Skeleton width={88} height={24} /><div className={styles.toolbarActions}><div className={styles.actions}><Skeleton width={44} height={44} /></div></div></div><ProfileEditorSkeleton /></div>
}

export function ProfileEditorSkeleton() {
  return <SkeletonRegion>
    <div className={styles.simpleNavigation}><TabNavigation value="groups" label="Seções da minha página" idPrefix="page-editor-pending" items={[{ id: 'groups', label: 'Grupos e links' }, { id: 'identity', label: 'Página' }, { id: 'appearance', label: 'Aparência' }]} /></div>
    <div className={styles.groupsFrame} data-layout="profile-form"><div className={groups.manager}><div className={groups.sectionHeading}><Skeleton width="12rem" height={28} /><SkeletonButton /></div><div className={groups.grid}>{[0, 1, 2].map(index => <div key={index} className={groups.card}><div className={groups.cardTop}><Skeleton width={56} height={24} /><Skeleton width={44} height={44} /></div><Skeleton width="70%" height={24} /><Skeleton width="50%" height={24} /><Skeleton width="30%" height={44} /></div>)}</div></div></div>
  </SkeletonRegion>
}
