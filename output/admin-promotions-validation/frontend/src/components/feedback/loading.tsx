import styles from './feedback.module.css'

export function Loading() {
  return <p className={styles.loading} role="status" aria-label="Carregando"><span className={styles.indicator} aria-hidden="true" />Carregando</p>
}
