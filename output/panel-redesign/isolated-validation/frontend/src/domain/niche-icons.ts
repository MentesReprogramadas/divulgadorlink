const NICHE_ICONS: Record<string, string> = {
  'ganhar-dinheiro': '/niches/ganhar-dinheiro.svg',
  'apostas': '/niches/apostas.svg',
  'compras-ofertas-cupons': '/niches/compras-ofertas-cupons.svg',
  'divulgacao-marketing': '/niches/divulgacao-marketing.svg',
  'filmes-series': '/niches/filmes-series.svg',
  'streaming': '/niches/streaming.svg',
  'jogos': '/niches/jogos.svg',
  'servicos-ferramentas': '/niches/servicos-ferramentas.svg',
  'tecnologia-internet': '/niches/tecnologia-internet.svg',
  'educacao-cursos': '/niches/educacao-cursos.svg',
  'saude-bem-estar': '/niches/saude-bem-estar.svg',
  'moda-beleza': '/niches/moda-beleza.svg',
  'afiliados-monetizacao': '/niches/afiliados-monetizacao.svg',
  'marketplace-vendas-diretas': '/niches/marketplace-vendas-diretas.svg',
  'futebol': '/niches/futebol.svg',
  'musicas': '/niches/musicas.svg',
  'entretenimento-geral': '/niches/entretenimento-geral.svg',
  'esportes': '/niches/esportes.svg',
  'financas-investimentos': '/niches/financas-investimentos.svg',
  'politica-sociedade': '/niches/politica-sociedade.svg',
  'apps-redes-plataformas': '/niches/apps-redes-plataformas.svg',
  'animes-nerd-geek': '/niches/animes-nerd-geek.svg',
  'amizade-relacionamentos': '/niches/amizade-relacionamentos.svg',
  'servicos-profissionais': '/niches/servicos-profissionais.svg',
  'adulto': '/niches/adulto.svg',
  'outro': '/niches/outro.svg',
}

export function nicheIcon(slug: string): string | null {
  return Object.hasOwn(NICHE_ICONS, slug) ? NICHE_ICONS[slug] : null
}
