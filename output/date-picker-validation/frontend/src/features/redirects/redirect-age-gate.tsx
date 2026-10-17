'use client'
import { AgePrompt, confirmAge } from '@/components/domain/age-gate'
export function RedirectAgeGate({ path }: { path: string }) {
  return <AgePrompt onYes={async () => { if (await confirmAge('yes')) location.replace(path) }} onNo={async () => { await confirmAge('no'); location.href = '/' }} />
}
