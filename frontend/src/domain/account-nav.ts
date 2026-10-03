export function isSignedIn(role: string | undefined): boolean {
  return role === 'USER' || role === 'ADMIN'
}

export function accountLinks(role: string | undefined): Array<{ href: string; label: string }> {
  if (role === 'ADMIN') {
    return [
      { href: '/painel', label: 'Painel' },
      { href: '/admin/visao', label: 'Admin' },
    ]
  }
  if (role === 'USER') return [{ href: '/painel', label: 'Painel' }]
  return [
    { href: '/login', label: 'Entrar' },
    { href: '/cadastro', label: 'Criar conta' },
  ]
}
