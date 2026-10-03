'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Field, TextArea } from '@/components/ui/input'
import { api } from '@/lib/api'

export default function Page() {
  const params = useParams<{ id: string }>()
  const [done, setDone] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const result = await api(`/v1/links/${params.id}/appeal`, {
      method: 'POST',
      body: JSON.stringify({ text: data.get('text') }),
    })
    if (result.status === 200 || result.status === 201) setDone(true)
  }

  return (
    <>
      <h2 className="panel-section-title">Contestar</h2>
      {done ? <p>Em revisão</p> : (
        <form className="auth-form" onSubmit={onSubmit}>
          <Field label="Explique o que aconteceu"><TextArea name="text" required /></Field>
          <Button type="submit">Enviar contestação</Button>
        </form>
      )}
    </>
  )
}
