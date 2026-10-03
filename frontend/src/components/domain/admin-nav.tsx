'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ITEMS = [
  { id: 'visao', href: '/admin/visao', label: 'Gestão' },
  { id: 'moderacao', href: '/admin/moderacao', label: 'Moderação' },
  { id: 'planos', href: '/admin/planos', label: 'Planos' },
  { id: 'estornos', href: '/admin/estornos', label: 'Estornos' },
  { id: 'configuracoes', href: '/admin/configuracoes', label: 'Configurações' },
] as const

export function AdminNav() {
  const path = usePathname()
  return (
    <nav className="panel-nav" aria-label="Admin">
      {ITEMS.map((item) => (
        <Link key={item.id} href={item.href} aria-current={path === item.href || path.startsWith(`${item.href}/`) ? 'page' : undefined}>{item.label}</Link>
      ))}
      <Link href="/painel">Painel</Link>
    </nav>
  )
}
