'use client'

import { useRouter } from 'next/navigation'
import { AgePrompt, confirmAge } from '@/components/domain/age-gate'

export function LinkAgeConfirmation() {
  const router = useRouter()
  async function answer(choice: 'yes' | 'no') {
    if (!(await confirmAge(choice))) throw new Error('Confirmação indisponível')
    router.refresh()
  }
  return <AgePrompt onYes={() => answer('yes')} onNo={() => answer('no')} />
}
