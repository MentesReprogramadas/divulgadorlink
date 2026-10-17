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
        <div className={styles.intro}>
          <p className={styles.free}>Publicar é grátis.</p>
          <h1 id="advertise-title">Publique o seu link.</h1>
          <p className={styles.lead}>Seu site, grupo ou perfil em um catálogo organizado por tema e rede.</p>
          <p className={styles.description}>Deixe claro o que você compartilha e ajude as pessoas a encontrar o seu conteúdo.</p>
          {cta ? <ButtonLink href={cta.href} className={styles.cta}>{cta.label}</ButtonLink> : <span className={`button button-primary ${styles.cta}`} aria-label="Carregando"><Skeleton width={150} height={24} /></span>}
          <p className={styles.note}>Sem promessa de audiência. O destaque é opcional e pago, depois da publicação.</p>
        </div>
        <aside className={styles.preview} aria-label="Exemplo ilustrativo de um link no catálogo">
          <div className={styles.previewHeader}>
            <span>No catálogo</span>
            <span className={styles.example}>Exemplo ilustrativo</span>
          </div>
          <div className={styles.previewBody}>
            <span className={styles.icon} aria-hidden="true">↗</span>
            <h2>Um lugar para o que você compartilha.</h2>
            <p>Um nome claro, uma boa descrição e o caminho para o seu conteúdo.</p>
            <div className={styles.tags}><span>Seu tema</span><span>Sua rede</span></div>
          </div>
          <p className={styles.previewFooter}>Organizado para ser encontrado.</p>
        </aside>
      </section>
      <section className={styles.process} aria-labelledby="advertise-process">
        <div className={styles.processHeading}>
          <h2 id="advertise-process">Da sua URL ao catálogo.</h2>
          <p>Você envia. Seu link passa por análise antes de aparecer no site.</p>
        </div>
        <ol className={styles.steps}>
          <li><h3>Prepare o seu link</h3><p>Uma URL https pública, um nome e uma descrição que expliquem o conteúdo.</p></li>
          <li><h3>Escolha onde ele se encaixa</h3><p>Um tema e uma rede ajudam a organizar o seu link no catálogo.</p></li>
          <li><h3>Acompanhe a análise</h3><p>Uma pessoa analisa o envio antes de ele ir ao ar. Você acompanha o resultado no painel.</p></li>
        </ol>
      </section>
    </main>
  )
}
