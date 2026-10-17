'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'

const AGE_KEY = 'catalogo.age'

export function readAge(): 'yes' | 'no' | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|; )age=(yes|no)(?:;|$)/)
  if (match?.[1] === 'yes' || match?.[1] === 'no') return match[1]
  const stored = sessionStorage.getItem(AGE_KEY)
  return stored === 'yes' || stored === 'no' ? stored : null
}

export async function confirmAge(choice: 'yes' | 'no'): Promise<boolean> {
  const result = await api('/v1/age', { method: 'POST', body: JSON.stringify({ choice }) })
  if (result.status !== 204) return false
  sessionStorage.setItem(AGE_KEY, choice)
  const secure = location.protocol === 'https:' ? '; secure' : ''
  document.cookie = `age=${choice}; path=/; samesite=lax${secure}`
  return true
}

export function AgePrompt({
  onYes,
  onNo,
}: {
  onYes: () => void | Promise<void>
  onNo: () => void | Promise<void>
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const onNoRef = useRef(onNo)
  const pendingRef = useRef(false)
  onNoRef.current = onNo
  const [pending, setPending] = useState(false)

  useLayoutEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (!dialog.open) dialog.showModal()
    function onCancel(event: Event) {
      event.preventDefault()
      if (pendingRef.current) return
      void onNoRef.current()
    }
    dialog.addEventListener('cancel', onCancel)
    return () => {
      dialog.removeEventListener('cancel', onCancel)
      if (dialog.open) dialog.close()
    }
  }, [])

  async function choose(choice: 'yes' | 'no') {
    if (pendingRef.current) return
    pendingRef.current = true
    setPending(true)
    if (choice === 'yes') await onYes()
    else await onNo()
    pendingRef.current = false
    setPending(false)
  }

  return (
    <dialog ref={ref} className="age-dialog" aria-labelledby="age-title">
      <h2 id="age-title">Conteúdo para maiores de 18 anos</h2>
      <p>Confirme sua idade para ver este conteúdo.</p>
      <div className="age-dialog-actions">
        <Button type="button" disabled={pending} onClick={() => void choose('yes')}>Tenho 18 anos ou mais</Button>
        <Button type="button" variant="secondary" disabled={pending} onClick={() => void choose('no')}>Não tenho</Button>
      </div>
    </dialog>
  )
}

export function AgeWall({
  required,
  children,
}: {
  required: boolean
  children: React.ReactNode
}) {
  const [state, setState] = useState<'wait' | 'ask' | 'open'>(required ? 'wait' : 'open')

  useEffect(() => {
    if (!required) return
    const saved = readAge()
    if (saved === 'yes') {
      setState('open')
      return
    }
    if (saved === 'no') {
      window.location.replace('/')
      return
    }
    setState('ask')
  }, [required])

  if (state === 'wait') return null
  if (state === 'ask') {
    return (
      <AgePrompt
        onYes={async () => { if (await confirmAge('yes')) setState('open') }}
        onNo={async () => { await confirmAge('no'); window.location.href = '/' }}
      />
    )
  }
  return <>{children}</>
}
