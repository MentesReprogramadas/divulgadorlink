'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { api } from '@/lib/api'

export default function Page() {
  const params = useParams<{ slug: string }>()
  const [names, setNames] = useState<string[]>([])
  useEffect(() => {
    void api<{ sponsored: Array<{ name: string }>; organic: Array<{ name: string }> }>(`/v1/networks/${params.slug}`).then((result) => {
      setNames([...(result.body.sponsored ?? []), ...(result.body.organic ?? [])].map((row) => row.name))
    })
  }, [params.slug])
  return <main><h1>Rede</h1>{names.map((name) => <p key={name}>{name}</p>)}</main>
}