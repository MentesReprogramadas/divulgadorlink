import { reminderDate, surfaceLabel, type RenewalReminder } from '../reminder-contract'
import styles from './renewal-reminders.module.css'
import { EmptyState } from '@/components/feedback/empty-state'

export function ReminderList({ reminders }: { reminders: RenewalReminder[] }) {
  if (!reminders.length) return <EmptyState />
  return <ul className={styles.list}>{reminders.map(row => <li key={row.promotionId}>
    <article className={styles.card} aria-label={'Vencimento de ' + row.link.name}>
      <div><h3>{row.link.name}</h3><p className={styles.note}>{surfaceLabel[row.surface] ?? row.surface}</p></div>
      <p><strong>Encerra em</strong><br /><time dateTime={row.expiresAt}>{reminderDate(row.expiresAt)}</time> · São Paulo</p>
      {row.summary?.coverage === 'COMPLETE' ? <div><p>{row.summary.impressions.toLocaleString('pt-BR')} impressões · {row.summary.clicks.toLocaleString('pt-BR')} cliques</p><p className={styles.note}>Observados de {row.summary.from} a {row.summary.to}. Sem garantia de resultados futuros.</p></div> : <p className={styles.note}>Resumo indisponível ou com cobertura incompleta. Consulte o relatório.</p>}
      <div className={styles.actions}><a className="button button-secondary" href={row.renewPath}>Ver renovação</a><a href={row.resultPath}>Ver resultado</a></div>
    </article>
  </li>)}</ul>
}
