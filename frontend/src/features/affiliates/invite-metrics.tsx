import { LiquidLens } from '@/components/ui/liquid-lens'
import type { AffiliateInviteMetrics } from './contracts'
import styles from './invite-metrics.module.css'

export function InviteMetrics({ metrics }: { metrics?: AffiliateInviteMetrics | null }) {
  const automatic = metrics?.automaticRedirects ?? 0, manual = metrics?.buttonRedirects ?? 0
  return <section className={styles.panel} aria-label="Desempenho do convite">
    <h3>Desempenho do convite</h3>
    <div className={styles.grid}>
      <div><LiquidLens radius={16} /><dl><dt>Visitas ao convite</dt><dd>{(metrics?.views ?? 0).toLocaleString('pt-BR')}</dd></dl></div>
      <div><LiquidLens radius={16} /><dl><dt>Cliques no botão</dt><dd>{(metrics?.buttonClicks ?? 0).toLocaleString('pt-BR')}</dd></dl></div>
      <div><LiquidLens radius={16} /><dl><dt>Encaminhamentos ao WhatsApp</dt><dd>{(automatic + manual).toLocaleString('pt-BR')}</dd></dl><small>{automatic.toLocaleString('pt-BR')} automáticos · {manual.toLocaleString('pt-BR')} pelo botão</small></div>
    </div>
    <p>{metrics ? 'Contagem desde ' + new Date(metrics.createdAt).toLocaleDateString('pt-BR') + '.' : 'Aguardando os primeiros acessos.'} Robôs e testes como admin ficam fora da contagem.</p>
    <p>Visitas podem incluir retornos da mesma pessoa. Encaminhamentos não confirmam participação no grupo.</p>
  </section>
}
