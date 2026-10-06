import type { Metadata } from 'next'
import { AreaFrame } from '@/components/domain/panel'
import { privateMetadata } from '@/domain/crawler-policy'

export const metadata: Metadata = privateMetadata

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AreaFrame title="Painel" create>{children}</AreaFrame>
}
