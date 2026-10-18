import { Skeleton, SkeletonRegion } from '@/components/feedback/skeleton'
import { ProfilePreviewShell } from './profile-preview-shell'
import styles from './personal-page.module.css'
import {ProfileSearchControls} from './profile-search-controls'
import search from './profile-search.module.css'
import {emptyProfileQuery} from '../profile-search-contract'

export function ProfilePreviewSkeleton() {
  return <ProfilePreviewShell><SkeletonRegion label="Carregando sua prévia"><div className={styles.page} style={{ background: '#f5f0e8' }}><article className={styles.profile}><header className={styles.identity}><Skeleton width={104} height={104} round /><Skeleton width="65%" height={46} /><Skeleton width="80%" height={26} /></header><div className={search.skeleton}><ProfileSearchControls query={emptyProfileQuery()} groups={[]} pending/></div>{[0, 1].map(i => <section className={styles.group} key={i}><Skeleton width="45%" height={20} /><ul>{[0, 1, 2].map(n => <li key={n}><Skeleton height={60} /></li>)}</ul></section>)}</article><footer className={styles.brand}><Skeleton width={90} height={32} /><Skeleton width={114} height={24} /></footer></div></SkeletonRegion></ProfilePreviewShell>
}
