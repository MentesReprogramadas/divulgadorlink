import styles from './feedback.module.css'

export function EmptyState({ children }: { children: string }) {
  return <p className={`empty ${styles.empty}`}>{children}</p>
}
