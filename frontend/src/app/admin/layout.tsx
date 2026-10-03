'use client'

import { AreaFrame } from '@/components/domain/panel'

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AreaFrame title="Admin" admin>{children}</AreaFrame>
}
