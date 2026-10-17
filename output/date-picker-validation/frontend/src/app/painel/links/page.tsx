'use client'

import { LinksArea, useAreaSession } from '@/components/domain/panel'

export default function Page() {
  const session = useAreaSession()
  return <LinksArea banned={session?.status === 'BANNED'} />
}
