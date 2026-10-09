export type InitialNetwork = {
  name: string
  slug: string
  knownHosts: string[]
  isPublicFacet: boolean
  requiresAge: boolean
}

export type InitialNiche = {
  name: string
  slug: string
  requiresAge: boolean
  isPublicFacet: boolean
}

export const INITIAL_NETWORKS: InitialNetwork[] = [
  { name: 'Discord', slug: 'discord', knownHosts: ['discord.com', 'discord.gg'], isPublicFacet: true, requiresAge: false },
  { name: 'Facebook', slug: 'facebook', knownHosts: ['facebook.com', 'fb.com', 'm.facebook.com'], isPublicFacet: true, requiresAge: false },
  { name: 'Fansly', slug: 'fansly', knownHosts: ['fansly.com'], isPublicFacet: true, requiresAge: true },
  { name: 'Fatal Model', slug: 'fatal-model', knownHosts: ['fatalmodel.com'], isPublicFacet: true, requiresAge: true },
  { name: 'Instagram', slug: 'instagram', knownHosts: ['instagram.com'], isPublicFacet: true, requiresAge: false },
  { name: 'Kwai', slug: 'kwai', knownHosts: ['kwai.com'], isPublicFacet: true, requiresAge: false },
  { name: 'LinkedIn', slug: 'linkedin', knownHosts: ['linkedin.com'], isPublicFacet: true, requiresAge: false },
  { name: 'OnlyFans', slug: 'onlyfans', knownHosts: ['onlyfans.com'], isPublicFacet: true, requiresAge: true },
  { name: 'Outro', slug: 'outro', knownHosts: [], isPublicFacet: false, requiresAge: false },
  { name: 'Pinterest', slug: 'pinterest', knownHosts: ['pinterest.com'], isPublicFacet: true, requiresAge: false },
  { name: 'Privacy', slug: 'privacy', knownHosts: ['privacy.com.br'], isPublicFacet: true, requiresAge: true },
  { name: 'Reddit', slug: 'reddit', knownHosts: ['reddit.com'], isPublicFacet: true, requiresAge: false },
  { name: 'Site', slug: 'site', knownHosts: [], isPublicFacet: true, requiresAge: false },
  { name: 'Telegram', slug: 'telegram', knownHosts: ['t.me', 'telegram.me'], isPublicFacet: true, requiresAge: false },
  { name: 'Threads', slug: 'threads', knownHosts: ['threads.net'], isPublicFacet: true, requiresAge: false },
  { name: 'TikTok', slug: 'tiktok', knownHosts: ['tiktok.com'], isPublicFacet: true, requiresAge: false },
  { name: 'Twitch', slug: 'twitch', knownHosts: ['twitch.tv'], isPublicFacet: true, requiresAge: false },
  { name: 'Vimeo', slug: 'vimeo', knownHosts: ['vimeo.com'], isPublicFacet: true, requiresAge: false },
  { name: 'Whatsapp', slug: 'whatsapp', knownHosts: ['wa.me', 'chat.whatsapp.com', 'api.whatsapp.com'], isPublicFacet: true, requiresAge: false },
  { name: 'X', slug: 'x', knownHosts: ['x.com', 'twitter.com'], isPublicFacet: true, requiresAge: false },
  { name: 'YouTube', slug: 'youtube', knownHosts: ['youtube.com', 'youtu.be'], isPublicFacet: true, requiresAge: false },
]

export const INITIAL_NICHES: InitialNiche[] = [
  { name: 'Ganhar Dinheiro', slug: 'ganhar-dinheiro', requiresAge: false, isPublicFacet: true },
  { name: 'Apostas', slug: 'apostas', requiresAge: false, isPublicFacet: true },
  { name: 'Compras, Ofertas & Cupons', slug: 'compras-ofertas-cupons', requiresAge: false, isPublicFacet: true },
  { name: 'Divulgação & Marketing', slug: 'divulgacao-marketing', requiresAge: false, isPublicFacet: true },
  { name: 'Filmes & Séries', slug: 'filmes-series', requiresAge: false, isPublicFacet: true },
  { name: 'Streaming', slug: 'streaming', requiresAge: false, isPublicFacet: true },
  { name: 'Jogos', slug: 'jogos', requiresAge: false, isPublicFacet: true },
  { name: 'Serviços & Ferramentas', slug: 'servicos-ferramentas', requiresAge: false, isPublicFacet: true },
  { name: 'Tecnologia & Internet', slug: 'tecnologia-internet', requiresAge: false, isPublicFacet: true },
  { name: 'Educação & Cursos', slug: 'educacao-cursos', requiresAge: false, isPublicFacet: true },
  { name: 'Saúde & Bem-estar', slug: 'saude-bem-estar', requiresAge: false, isPublicFacet: true },
  { name: 'Moda & Beleza', slug: 'moda-beleza', requiresAge: false, isPublicFacet: true },
  { name: 'Afiliados & Monetização', slug: 'afiliados-monetizacao', requiresAge: false, isPublicFacet: true },
  { name: 'Marketplace & Vendas Diretas', slug: 'marketplace-vendas-diretas', requiresAge: false, isPublicFacet: true },
  { name: 'Futebol', slug: 'futebol', requiresAge: false, isPublicFacet: true },
  { name: 'Músicas', slug: 'musicas', requiresAge: false, isPublicFacet: true },
  { name: 'Entretenimento Geral', slug: 'entretenimento-geral', requiresAge: false, isPublicFacet: true },
  { name: 'Esportes', slug: 'esportes', requiresAge: false, isPublicFacet: true },
  { name: 'Finanças & Investimentos', slug: 'financas-investimentos', requiresAge: false, isPublicFacet: true },
  { name: 'Política & Sociedade', slug: 'politica-sociedade', requiresAge: false, isPublicFacet: true },
  { name: 'Apps, Redes Sociais & Plataformas', slug: 'apps-redes-plataformas', requiresAge: false, isPublicFacet: true },
  { name: 'Animes, Nerd & Geek', slug: 'animes-nerd-geek', requiresAge: false, isPublicFacet: true },
  { name: 'Amizade & Relacionamentos', slug: 'amizade-relacionamentos', requiresAge: false, isPublicFacet: true },
  { name: 'Serviços Profissionais', slug: 'servicos-profissionais', requiresAge: false, isPublicFacet: true },
  { name: 'Adulto', slug: 'adulto', requiresAge: true, isPublicFacet: true },
  { name: 'Outro', slug: 'outro', requiresAge: false, isPublicFacet: false },
]
