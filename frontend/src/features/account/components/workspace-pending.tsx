'use client'
import { Skeleton, SkeletonRegion } from '@/components/feedback/skeleton'
import { ActionSkeleton } from '@/components/layout/workspace-skeleton'
import { WorkspaceContentSkeleton } from '@/components/layout/workspace-loading-content'
import { workspaceHeading } from './workspace-heading'
import styles from './workspace.module.css'

export function WorkspacePending({ path, admin, create = false }: { path: string; title?: string; admin?: boolean; create?: boolean }) {
  const heading = workspaceHeading(path)
  return <main className={styles.shell} aria-busy="true">
    <aside className={styles.sidebar}><p className={styles.sidebarTitle}>{admin ? 'Administração' : 'Meu espaço'}<small>Tem Link Aqui</small></p><SkeletonRegion><div className={styles.navigation}>{[0, 1, 2].map(i => <div className={styles.navGroup} key={i}><p className={styles.groupLabel}><Skeleton width="50%" height={21} /></p>{Array.from({ length: i === 1 ? 3 : 2 }, (_, n) => <Skeleton key={n} height={44} />)}</div>)}</div></SkeletonRegion></aside>
    <div className={styles.content}><header className={styles.top}><div><h1>{heading.title}</h1></div></header><div className={styles.stage}>
      {create && (path === '/painel' || path === '/painel/visao') ? <SkeletonRegion><ActionSkeleton count={2} /></SkeletonRegion> : null}
      <WorkspaceContentSkeleton path={path} />
    </div></div>
  </main>
}
