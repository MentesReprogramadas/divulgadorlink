'use client'

import styles from './global-error.module.css'
import { GlobalErrorContent } from './global-error-content'

export default function GlobalError() {
  return (
    <html lang="pt-BR">
      <head><title>Falha ao carregar | Tem Link Aqui</title></head>
      <body className={styles.body}>
        <GlobalErrorContent />
      </body>
    </html>
  )
}
