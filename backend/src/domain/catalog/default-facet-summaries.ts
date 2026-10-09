import { MAX_SUMMARY, MIN_TEXT } from '@/domain/catalog/index-policy'

export type FacetKind = 'niche' | 'network'

type FacetFlags = {
  slug: string
  summary: string | null
  requiresAge: boolean
  isPublicFacet: boolean
}

const NICHE_SUMMARIES: Record<string, string> = {
  'ganhar-dinheiro': 'Grupos sobre renda extra, freelas e oportunidades de ganho. Veja a rede de cada link e leia a descrição antes de entrar.',
  apostas: 'Palpites, odds e discussões sobre apostas, separados por rede. A descrição do link diz o foco do grupo antes do convite.',
  'compras-ofertas-cupons': 'Ofertas, cupons e achados de compra publicados por lojistas e comunidades. Cada link mostra a rede e o que o grupo trata.',
  'divulgacao-marketing': 'Canais de divulgação, tráfego e marketing para quem promove um link. Escolha a rede e veja o foco de cada grupo.',
  'filmes-series': 'Comunidades de filmes e séries: estreias, recomendações e comentários. O catálogo mostra a rede de cada link publicado.',
  streaming: 'Grupos sobre plataformas de streaming, lives e transmissões. Compare os links publicados e entre na rede indicada.',
  jogos: 'Servidores, guildas e comunidades de jogos organizados por rede. A descrição de cada link diz o que você encontra ao entrar.',
  'servicos-ferramentas': 'Ferramentas, utilitários e serviços compartilhados em grupos. Veja a rede do link e para que a comunidade serve.',
  'tecnologia-internet': 'Comunidades de tecnologia, internet e novidades digitais. Os links ficam separados por rede para achar o grupo certo.',
  'educacao-cursos': 'Cursos, aulas e grupos de estudo publicados por tema. Cada link indica a rede e o assunto da comunidade.',
  'saude-bem-estar': 'Grupos de saúde, hábitos e bem-estar com o convite da rede em que foram publicados. Leia o foco antes de entrar.',
  'moda-beleza': 'Looks, beleza e tendências compartilhados em grupos e canais. O catálogo mostra a rede e o tema de cada link.',
  'afiliados-monetizacao': 'Comunidades de afiliados, comissões e formas de monetizar um canal. Veja em qual rede o grupo está e o que ele discute.',
  'marketplace-vendas-diretas': 'Grupos de venda direta, marketplaces e vitrines de produto. Cada link diz a rede e o tipo de oferta publicada.',
  futebol: 'Resenhas, rodadas e comunidades de futebol publicadas por rede. Escolha o grupo pelo tema antes de abrir o convite.',
  musicas: 'Playlists, lançamentos e comunidades de música organizados por rede. A descrição do link explica o que o grupo publica.',
  'entretenimento-geral': 'Variedades, humor e entretenimento fora de um tema só. Os links mostram a rede e o tipo de conteúdo do grupo.',
  esportes: 'Treino, modalidades e vida fitness em grupos separados por rede. A descrição do link mostra o foco da comunidade.',
  'financas-investimentos': 'Grupos sobre finanças pessoais, investimentos e mercado. Cada link indica a rede e o assunto tratado ali.',
  'politica-sociedade': 'Debates, notícias e comunidades de política e sociedade. O catálogo organiza os links pela rede em que foram publicados.',
  'apps-redes-plataformas': 'Novidades de aplicativos, redes sociais e plataformas. Escolha o grupo pela rede e pelo que a descrição explica.',
  'animes-nerd-geek': 'Comunidades de anime, cultura nerd e geek reunidas por rede. Leia o link para ver o tema do grupo antes de entrar.',
  'amizade-relacionamentos': 'Grupos de amizade, conversa e relacionamentos, separados por rede. A descrição diz o clima da comunidade.',
  'servicos-profissionais': 'Serviços profissionais e contatos publicados em grupos. Cada link mostra a rede e o tipo de trabalho oferecido.',
}

const NETWORK_SUMMARIES: Record<string, string> = {
  discord: 'Servidores de Discord publicados no catálogo, separados por tema. A descrição do link diz o que acontece no servidor.',
  facebook: 'Grupos e páginas do Facebook reunidos por assunto. Veja o tema do link antes de abrir o convite da comunidade.',
  instagram: 'Perfis e comunidades do Instagram organizados por nicho. Cada link explica o conteúdo e abre direto na rede.',
  kwai: 'Canais e perfis do Kwai publicados por tema. A descrição mostra o foco do perfil antes de abrir o aplicativo.',
  linkedin: 'Páginas e comunidades do LinkedIn para contato profissional. O link indica o assunto e abre o perfil na rede.',
  pinterest: 'Pastas e perfis do Pinterest com referências publicadas por tema. Cada link descreve o que a pasta reúne.',
  reddit: 'Comunidades do Reddit organizadas por assunto. Leia a descrição do link para saber o foco antes de entrar.',
  site: 'Sites publicados no catálogo, fora de uma rede social específica. A descrição diz o que a página oferece ao visitante.',
  telegram: 'Grupos e canais do Telegram separados por tema. O convite abre direto e a descrição explica o conteúdo.',
  threads: 'Perfis e conversas do Threads reunidos por assunto. Cada link indica o tema antes de abrir a rede.',
  tiktok: 'Perfis do TikTok organizados por nicho. A descrição do link resume o tipo de conteúdo publicado naquele perfil.',
  twitch: 'Canais da Twitch publicados por tema de transmissão. Veja a descrição para saber que tipo de live o canal faz.',
  vimeo: 'Canais e vídeos do Vimeo reunidos por assunto. Cada link descreve o conteúdo antes de abrir o player.',
  whatsapp: 'Grupos de WhatsApp com convite publicado por tema. A descrição diz o assunto do grupo antes de você entrar.',
  x: 'Perfis e comunidades do X organizados por assunto. O link mostra o tema e abre direto na rede.',
  youtube: 'Canais do YouTube publicados por tema. A descrição resume o conteúdo do canal antes de você abrir o vídeo.',
}

export function defaultFacetSummary(kind: FacetKind, slug: string): string | null {
  const table = kind === 'niche' ? NICHE_SUMMARIES : NETWORK_SUMMARIES
  return table[slug] ?? null
}

export function summaryToApply(kind: FacetKind, row: FacetFlags): string | null {
  if (row.summary?.trim() || row.requiresAge || !row.isPublicFacet) return null
  const summary = defaultFacetSummary(kind, row.slug)
  if (!summary) return null
  if (summary.length < MIN_TEXT || summary.length > MAX_SUMMARY || summary.includes('<')) return null
  return summary
}

export const facetSummaryTables = {
  niche: NICHE_SUMMARIES,
  network: NETWORK_SUMMARIES,
}
