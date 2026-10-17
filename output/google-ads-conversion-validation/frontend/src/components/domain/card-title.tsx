import styles from './card-title.module.css'

export function CardTitle({ text }: { text: string }) {
  return <span className={styles.title} title={text}>{text}</span>
}
