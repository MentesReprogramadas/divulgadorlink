import styles from './pets-landing.module.css'

export function PetsLanding() {
  return <main className={styles.page} aria-labelledby="pets-title">
    <img className={styles.avatar} src="/ofertas/pets/avatar.webp" width={512} height={512} fetchPriority="high" alt="Cachorro e gato ao lado da marca Achadinhos Pet, Tem Link Aqui" />
    <h1 id="pets-title">Achadinhos Pet</h1>
    <a className={styles.join} href="/ofertas/entrar/pets">
      <img src="/networks/whatsapp.svg" width={24} height={24} alt="" aria-hidden="true" />
      Entrar no grupo grátis
    </a>
  </main>
}
