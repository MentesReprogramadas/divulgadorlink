import type { DestinationRevision } from '../redirect-contract'
import { revisionStatus } from '../redirect-contract'
import styles from './redirects.module.css'
const date = (value: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(value))
export function RedirectHistory({ revisions, activeId }: { revisions: DestinationRevision[]; activeId: string | null }) {
  return <section aria-label="Histórico de destinos" className={styles.section}><h3>Histórico de destinos</h3><p className={styles.note}>Até 50 versões por 180 dias. O destino atualmente publicado é preservado.</p>
    <p className={styles.note}>Acessos redirecionados incluem repetições. Acessos do dono e de administradores não entram na contagem.</p>
    <ol className={styles.history}>{revisions.map(row => <li key={row.id}>
      <div className={styles.actions}><strong>Versão {row.number} · {row.id === activeId ? 'Destino atual' : revisionStatus[row.status]}</strong><time dateTime={row.createdAt}>{date(row.createdAt)}</time></div>
      <p>{row.label}</p><p className={styles.url}>{row.destinationUrl}</p>{row.errorMessage ? <p>{row.errorMessage}</p> : null}
      <dl className={styles.metrics}><div><dt>Acessos no período</dt><dd>{row.accesses.reduce((sum, day) => sum + day.accesses, 0)}</dd></div>{row.accesses.map(day => <div key={day.day}><dt>{day.day.slice(0, 10)}</dt><dd>{day.accesses}</dd></div>)}</dl>
    </li>)}</ol>
  </section>
}
