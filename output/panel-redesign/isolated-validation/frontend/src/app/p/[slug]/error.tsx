'use client'
import { ErrorState } from '@/components/feedback/error-state'
import styles from '@/features/profiles/components/profiles.module.css'
export default function ProfileError({ reset }: { reset: () => void }) {
  return <main className={styles.publicPage}><h1>Perfil indisponível no momento</h1><ErrorState onRetry={reset} /></main>
}
