import { ButtonLink } from '@/components/ui/button'
import { Skeleton } from '@/components/feedback/skeleton'
import styles from './advertise-landing.module.css'

type AdvertiseLandingProps = {
  cta: { href: string; label: string } | null
}

export function AdvertiseLanding({ cta }: AdvertiseLandingProps) {
  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="advertise-title">
        <p className={styles.free}>Publicar é grátis.</p>
        <h1 id="advertise-title">Divulgue seu link.</h1>
        <p className={styles.lead}>Seu site, grupo ou perfil no catálogo, organizado por tema e rede.</p>
        {cta ? <ButtonLink href={cta.href} className={styles.cta}>{cta.label}</ButtonLink> : <span className={`button button-primary ${styles.cta}`} aria-label="Carregando"><Skeleton width={150} height={24} /></span>}
        <p className={styles.note}>Seu envio passa por análise antes de ir ao ar.<br />Destaques são opcionais e pagos.</p>
        <ol className={styles.steps} aria-label="Como publicar">
          <li>Adicione seu link</li>
          <li>Escolha tema e rede</li>
          <li>Acompanhe no painel</li>
        </ol>
      </section>
    </main>
  )
}
