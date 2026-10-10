const UTM = /^[a-zA-Z0-9._~-]{1,80}$/

const STATIC = new Set([
  '/',
  '/divulgar',
  '/cadastro',
  '/login',
  '/busca',
  '/termos',
  '/privacidade',
  '/esqueci-senha',
  '/recuperar-senha',
  '/nao-encontrado',
  '/painel',
  '/painel/visao',
  '/painel/links',
  '/painel/links/novo',
  '/painel/pedidos',
  '/painel/conta',
  '/painel/verificar',
])

const DYNAMIC: Array<[RegExp, string]> = [
  [/^\/link\/[^/]+$/, '/link/:id'],
  [/^\/rede\/[^/]+$/, '/rede/:slug'],
  [/^\/nicho\/[^/]+$/, '/nicho/:slug'],
  [/^\/painel\/links\/[^/]+\/(editar|destaque|contestar)$/, '/painel/links/:id/$1'],
]

export function pathTemplate(raw: string): string | null {
  const path = raw.length > 1 ? raw.replace(/\/+$/, '') : raw
  if (path === '/admin' || path.startsWith('/admin/')) return null
  if (STATIC.has(path)) return path
  for (const [pattern, template] of DYNAMIC) {
    if (pattern.test(path)) return path.replace(pattern, template)
  }
  return '/outros'
}

export function utmToken(raw: string | undefined): string {
  return raw && UTM.test(raw) ? raw : ''
}
