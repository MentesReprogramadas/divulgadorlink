'use client'

import styles from './global-error.module.css'

export function GlobalErrorContent() {
  return (
    <main className={styles.content} aria-labelledby="global-error-title">
      <div className={styles.brand} aria-hidden="true">tem link aqui</div>
      <section className={styles.panel}>
        <svg className={styles.symbol} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
          <path d="M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 11.5-2L20 8M4 16l2.5 3A7 7 0 0 0 18 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h1 id="global-error-title" className={styles.title}>Não foi possível abrir esta página</h1>
        <p className={styles.message} role="alert">Ocorreu uma falha ao carregar o conteúdo. Tente novamente.</p>
        <div className={styles.actions}>
          <button type="button" onClick={() => window.location.reload()}>Tentar de novo</button>
          <a href="/">Voltar ao catálogo</a>
        </div>
      </section>
    </main>
  )
}
