'use client'

import { Button } from '@/components/ui/button'
import { ActionIcon } from '@/components/ui/action-icon'
import type { AffiliateArea } from './affiliate-navigation'
import type { AffiliateSnapshot } from './contracts'
import styles from './affiliates.module.css'

export function AffiliateOverview({ snapshot, busy, onArea, onNewSegment, onOpenSegment }: { snapshot: AffiliateSnapshot; busy: boolean; onArea: (area: AffiliateArea) => void; onNewSegment: () => void; onOpenSegment: (id: string) => void }) {
  const attention = snapshot.summary.uncertain + snapshot.summary.failed
  const next = snapshot.segments.find(segment => !segment._count?.groups || !segment._count?.offers) ?? snapshot.segments[0]
  return <div className={styles.overview}>
    <section className={styles.section} aria-labelledby="affiliate-journey"><div className={styles.sectionHeading}><h2 id="affiliate-journey">Como começar a enviar ofertas</h2><p>Você percorre estes passos dentro de cada segmentação, sem precisar navegar entre ferramentas.</p></div><ol className={styles.journeyGuide}><li><strong>Defina o tema</strong><p>Crie uma segmentação. Os termos e a coleta de produtos começam automaticamente.</p></li><li><strong>Conecte o WhatsApp</strong><p>Leia o QR code da conta que cuidará dos grupos.</p></li><li><strong>Prepare o grupo</strong><p>Crie o primeiro grupo pelo painel ou escolha um grupo existente.</p></li><li><strong>Abra e envie uma oferta</strong><p>Escolha um produto avaliado. Confira foto, mensagem, preço e grupos na prévia e confirme Enviar.</p></li></ol></section>
    <section className={styles.nextStep} aria-label="Comece por aqui"><div className={styles.nextStepBody}><div><h2>{next ? 'Continue de onde parou' : 'Comece pela sua primeira segmentação'}</h2><p>{next ? `Abra ${next.name} para ver o próximo passo, os grupos e as ofertas deste tema.` : 'Escolha um tema, como Natal. A coleta de produtos começa automaticamente. O assistente orienta a conexão do WhatsApp e a preparação do grupo; depois você revisa e envia cada oferta.'}</p></div><Button disabled={busy} onClick={() => next ? onOpenSegment(next.id) : onNewSegment()}><ActionIcon name={next ? 'next' : 'plus'} />{next ? 'Continuar configuração' : 'Criar primeira segmentação'}</Button></div></section>
    {snapshot.segments.length ? <section className={[styles.section, styles.overviewCard].join(' ')}><div className={styles.heading}><h2>Suas segmentações</h2><Button variant="ghost" onClick={() => onArea('segments')}>Ver todas</Button></div>{snapshot.segments.slice(0, 4).map(segment => <div className={styles.row} key={segment.id}><div><strong>{segment.name}</strong><p>{segment._count?.groups ?? 0} grupos · {segment._count?.offers ?? 0} ofertas</p></div><Button variant="secondary" disabled={busy} onClick={() => onOpenSegment(segment.id)}>Abrir<span className={styles.srOnly}> {segment.name}</span><ActionIcon name="next" /></Button></div>)}</section> : null}
    {attention ? <section className={styles.warning}><h2>Envios que precisam de atenção</h2><p>{attention} entregas aguardam sua conferência. Verifique o grupo antes de tentar novamente.</p><Button variant="secondary" onClick={() => onArea('deliveries')}>Conferir envios</Button></section> : null}
  </div>
}
