import type { ActionIconName } from '@/components/ui/action-icon'

// Destinos diferentes têm símbolos diferentes; aliases da mesma página usam o mesmo.
export const navigationIcons = {
  '/': 'catalog',
  '/busca': 'search',
  '/login': 'login',
  '/cadastro': 'signup',
  '/painel': 'overview',
  '/painel/links': 'link',
  '/painel/links/novo': 'createLink',
  '/painel/perfil': 'profile',
  '/painel/convites': 'invite',
  '/painel/pedidos': 'orders',
  '/painel/lembretes': 'bell',
  '/painel/favoritos': 'star',
  '/painel/conta': 'account',
  '/admin/visao': 'management',
  '/admin/moderacao': 'shield',
  '/admin/denuncias': 'report',
  '/admin/disponibilidade': 'repair',
  '/admin/planos': 'plans',
  '/admin/estornos': 'refund',
  '/admin/integracoes': 'integration',
  '/admin/configuracoes': 'settings',
} as const satisfies Record<string, ActionIconName>

export type NavigationDestination = keyof typeof navigationIcons
