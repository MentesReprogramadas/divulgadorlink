'use client'
import { AgePrompt, confirmAge } from '@/components/domain/age-gate'
export function ProfileAgeGate() { return <AgePrompt onYes={async () => { if (await confirmAge('yes')) location.reload() }} onNo={async () => { await confirmAge('no'); location.href = '/' }} /> }
