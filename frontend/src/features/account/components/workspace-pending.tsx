'use client'
import { SkeletonRegion } from '@/components/feedback/skeleton'
import { ActionSkeleton } from '@/components/layout/workspace-skeleton'
import { WorkspaceNavigationSkeleton } from './workspace-navigation'
import { WorkspaceContentSkeleton } from '@/components/layout/workspace-loading-content'
import { workspaceHeading } from './workspace-heading'
import styles from './workspace.module.css'
import { LiquidLens } from '@/components/ui/liquid-lens'

export function WorkspacePending({ path, admin, create = false }: { path: string; title?: string; admin?: boolean; create?: boolean }) {
  const heading = workspaceHeading(path)
  return <main className={styles.shell} aria-busy="true">
    <aside className={styles.sidebar}><LiquidLens radius={20}/><div className={styles.desktopMenu} role="region" aria-label="Menu lateral" tabIndex={0}><WorkspaceNavigationSkeleton path={path} admin={admin}/></div></aside>
    <div className={styles.content}><header className={styles.top}><div><h1>{heading.title}</h1></div></header><div className={styles.stage}>
      {create && (path === '/painel' || path === '/painel/visao') ? <SkeletonRegion><ActionSkeleton count={2} /></SkeletonRegion> : null}
      <WorkspaceContentSkeleton path={path} />
    </div></div>
  </main>
}
