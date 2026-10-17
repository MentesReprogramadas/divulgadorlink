import Link from 'next/link'
import type { ReactNode } from 'react'
import styles from './sidebar-link.module.css'

export function SidebarLink({ href, active, children }: { href: string; active?: boolean; children: ReactNode }) {
  return <Link href={href} className={styles.link} aria-current={active ? 'page' : undefined}>{children}</Link>
}
