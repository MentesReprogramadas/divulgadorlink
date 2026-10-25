import Link from 'next/link'
import type { ReactNode } from 'react'
import styles from './sidebar-link.module.css'
import { LiquidLens } from '@/components/ui/liquid-lens'

export function SidebarLink({ href, active, children, current = 'page' }: { href: string; active?: boolean; children: ReactNode; current?: 'page' | 'location' }) {
  return <Link href={href} className={styles.link} aria-current={active ? current : undefined}><LiquidLens radius={12} />{children}</Link>
}
