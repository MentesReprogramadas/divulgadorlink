import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Tem Link Aqui',
  description: 'Catálogo público de links',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <nav>
          <a href="/">Home</a>
          <a href="/busca">Busca</a>
          <a href="/login">Entrar</a>
          <a href="/cadastro">Criar conta</a>
        </nav>
        {children}
      </body>
    </html>
  )
}
