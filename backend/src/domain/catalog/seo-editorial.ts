import { createHash } from 'node:crypto'
import { z } from 'zod'
import type { LinkRecord } from '@/repositories/links-repository'

const plain = (max: number) => z.string().trim().min(1).max(max).refine(value => !/[<>]/.test(value) && [...value].every(char => char.charCodeAt(0) >= 32 || '\t\n\r'.includes(char)), 'Use texto puro.')
export const seoSlugSchema = z.string().min(1).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
export const seoLinkIdSchema = z.string().min(1).max(100).regex(/^[a-zA-Z0-9-]+$/)
export const seoTextSchema = z.object({ title: plain(120), description: plain(1000), explicit: z.boolean(), approved: z.boolean() }).strict()
export const seoPreviewSchema = seoTextSchema.extend({ fingerprint: z.string().regex(/^[a-f0-9]{64}$/) }).strict()
export const seoCollectionSchema = seoTextSchema.extend({
  slug: seoSlugSchema,
  networkSlug: seoSlugSchema.nullable(),
  nicheSlug: seoSlugSchema.nullable(),
  linkIds: z.array(seoLinkIdSchema).min(1).max(200).refine(ids => new Set(ids).size === ids.length, 'Escolha cada publicação uma vez.').optional(),
}).strict().refine(value => value.networkSlug !== null || value.nicheSlug !== null, 'Escolha uma rede ou nicho.')
const safeRecord = z.unknown().refine(value => value !== null && typeof value === 'object' && !Object.hasOwn(value, '__proto__'), 'Chave inválida.')
export const seoFacetsSchema = safeRecord.pipe(z.record(z.string().regex(/^(?:niche|network):[a-z0-9]+(?:-[a-z0-9]+)*$/), seoTextSchema))
export const seoEditorialSchema = z.object({
  version: z.number().int().min(0).max(2147483646),
  facets: seoFacetsSchema,
  links: safeRecord.pipe(z.record(seoLinkIdSchema, seoPreviewSchema)),
  collections: z.array(seoCollectionSchema).max(100),
}).strict().refine(value => new Set(value.collections.map(row => row.slug)).size === value.collections.length, 'Os endereços das coleções precisam ser únicos.')

export type SeoText = z.infer<typeof seoTextSchema>
export type SeoPreview = z.infer<typeof seoPreviewSchema>
export type SeoCollection = z.infer<typeof seoCollectionSchema>
export type SeoEditorial = z.infer<typeof seoEditorialSchema>

export function linkFingerprint(link: Pick<LinkRecord, 'id' | 'tenantId' | 'name' | 'description' | 'canonicalUrl' | 'networkId' | 'nicheId' | 'updatedAt'>): string {
  return createHash('sha256').update(JSON.stringify([link.id, link.tenantId, link.name, link.description, link.canonicalUrl, link.networkId, link.nicheId, link.updatedAt.toISOString()])).digest('hex')
}

export function approvedPreview(state: SeoEditorial, link: LinkRecord): SeoPreview | null {
  const preview = state.links[link.id]
  return preview?.approved && preview.fingerprint === linkFingerprint(link) ? preview : null
}

const networks: Record<string, readonly [string, string]> = {
  telegram: ['Grupos e canais do Telegram', 'Encontre grupos, canais e links do Telegram por assunto. Explore comunidades, leia a apresentação e escolha o conteúdo do seu interesse.'],
  whatsapp: ['Grupos e canais de WhatsApp', 'Descubra grupos e canais de WhatsApp por categoria: ofertas, amizade, estudos e outros assuntos publicados no catálogo.'],
  discord: ['Servidores e comunidades Discord', 'Explore servidores Discord por tema, jogos e interesses. Conheça a proposta de cada comunidade antes de participar.'],
  facebook: ['Grupos e páginas do Facebook', 'Encontre grupos e páginas do Facebook por interesse, incluindo comunidades, vendas e conteúdo dos temas publicados no catálogo.'],
  instagram: ['Perfis do Instagram por assunto', 'Conheça perfis do Instagram organizados por tema. Descubra criadores, achadinhos e páginas ligadas aos seus interesses.'],
  youtube: ['Canais do YouTube por assunto', 'Descubra canais do YouTube por tema e conheça a proposta de cada criador. Explore conteúdos e encontre o próximo canal para acompanhar.'],
  tiktok: ['Criadores e perfis do TikTok', 'Explore perfis e criadores do TikTok por assunto. Encontre apresentações e links para conteúdos ligados aos seus interesses.'],
  linkedin: ['Profissionais e páginas do LinkedIn', 'Encontre perfis profissionais e páginas do LinkedIn por especialidade e tema. Conheça os serviços e conteúdos apresentados no catálogo.'],
  reddit: ['Comunidades e fóruns do Reddit', 'Descubra comunidades do Reddit por assunto. Encontre fóruns para conversar, aprender e acompanhar temas do seu interesse.'],
  x: ['Perfis e comunidades no X e Twitter', 'Explore perfis e comunidades do X, também conhecido como Twitter. Conheça páginas de notícias, criadores e temas publicados no catálogo.'],
  pinterest: ['Perfis e ideias no Pinterest', 'Encontre perfis e referências no Pinterest por interesse, como moda, beleza, decoração e outros temas apresentados no catálogo.'],
  twitch: ['Streamers e canais da Twitch', 'Descubra streamers e canais da Twitch por tema. Conheça as apresentações e encontre transmissões e comunidades do seu interesse.'],
  kwai: ['Criadores e perfis do Kwai', 'Conheça perfis de criadores do Kwai organizados por assunto. Explore as apresentações e encontre conteúdo para acompanhar.'],
  vimeo: ['Criadores e vídeos no Vimeo', 'Explore portfólios, criadores e obras publicadas no Vimeo. Conheça os projetos apresentados e acesse seus endereços oficiais.'],
  threads: ['Perfis e conversas no Threads', 'Descubra perfis no Threads por assunto. Conheça criadores e páginas que compartilham interesses presentes no catálogo.'],
  site: ['Sites e ferramentas por categoria', 'Encontre sites e ferramentas por finalidade. Explore recursos, serviços e páginas úteis organizados por assunto.'],
  privacy: ['Criadores adultos na Privacy +18', 'Conheça apresentações públicas aprovadas de criadores adultos na Privacy. O acesso ao conteúdo restrito exige confirmação de idade.'],
  onlyfans: ['Criadores adultos no OnlyFans +18', 'Descubra apresentações públicas aprovadas de criadores adultos no OnlyFans. Confirme sua idade antes de acessar o conteúdo restrito.'],
  fansly: ['Criadores adultos no Fansly +18', 'Explore apresentações públicas aprovadas de criadores adultos no Fansly. O conteúdo restrito permanece protegido pela confirmação de idade.'],
  'fatal-model': ['Fatal Model', 'Plataforma cadastrada no catálogo. A presença de uma rede não implica aprovação ou recomendação das ofertas externas.'],
}
const niches: Record<string, readonly [string, string]> = {
  adulto: ['Comunidades e conteúdo adulto +18', 'Explore apresentações públicas aprovadas de comunidades e criadores de conteúdo adulto autorizado. Confirme sua idade para acessar conteúdo restrito.'],
  apostas: ['Grupos e comunidades de apostas esportivas', 'Encontre comunidades de apostas esportivas, palpites de futebol e análises por rede. A apresentação de um grupo não garante ganhos ou resultados.'],
  'compras-ofertas-cupons': ['Grupos de ofertas, achadinhos e cupons', 'Descubra comunidades de ofertas, promoções e achadinhos. Encontre apresentações de grupos e páginas por loja, produto e rede.'],
  esportes: ['Grupos e comunidades de esportes', 'Explore comunidades de corrida, academia e outras modalidades esportivas. Encontre pessoas e conteúdos por tema e rede.'],
  'ganhar-dinheiro': ['Comunidades de renda extra e trabalho online', 'Conheça grupos e conteúdos sobre renda extra e trabalho online. Confira a proposta de cada publicação e avalie as condições sem promessa de ganhos.'],
  'divulgacao-marketing': ['Grupos de divulgação e marketing digital', 'Encontre comunidades de divulgação de links, marketing digital e networking. Explore as propostas dos grupos por rede e interesse.'],
  'filmes-series': ['Comunidades de filmes, séries e cinema', 'Descubra grupos e páginas para conversar sobre filmes, séries, gêneros e recomendações de cinema. Explore os assuntos publicados no catálogo.'],
  streaming: ['Comunidades de streaming e criadores', 'Encontre comunidades e páginas sobre streaming. Conheça a finalidade de cada publicação antes de escolher o serviço ou grupo do seu interesse.'],
  jogos: ['Grupos e servidores de jogos', 'Descubra comunidades e servidores por jogo e rede. Encontre apresentações de grupos para conversar, trocar experiências e organizar partidas.'],
  'servicos-ferramentas': ['Sites, serviços e ferramentas úteis', 'Explore sites e ferramentas por finalidade, incluindo recursos digitais e inteligência artificial. Conheça a proposta de cada serviço publicado.'],
  'tecnologia-internet': ['Comunidades de tecnologia, programação e IA', 'Encontre grupos e conteúdos de tecnologia, programação e inteligência artificial. Explore comunidades por rede e tema de interesse.'],
  'educacao-cursos': ['Grupos de estudos, concursos e cursos', 'Descubra comunidades de estudos, concursos, ENEM e idiomas. Conheça os objetivos dos grupos e encontre conteúdos por rede.'],
  'saude-bem-estar': ['Comunidades de saúde, fitness e bem-estar', 'Explore grupos e conteúdos de fitness, bem-estar e apoio. Confira a finalidade de cada comunidade sem substituir acompanhamento profissional.'],
  'moda-beleza': ['Grupos e perfis de moda e beleza', 'Encontre comunidades, perfis e conteúdos de moda, maquiagem e beleza. Explore inspirações e propostas organizadas por rede.'],
  'afiliados-monetizacao': ['Grupos de afiliados e monetização', 'Descubra comunidades de afiliados e criação de conteúdo. Conheça grupos por plataforma e tema, sem promessa de remuneração.'],
  'marketplace-vendas-diretas': ['Grupos de compra, venda e desapego', 'Explore comunidades de compra, venda, trocas e desapego. Conheça a proposta de cada grupo e escolha a rede do seu interesse.'],
  futebol: ['Grupos de futebol e torcedores', 'Encontre comunidades de futebol, torcidas e discussão de campeonatos. Explore grupos por clube, interesse e rede.'],
  musicas: ['Grupos e comunidades de música', 'Descubra comunidades e páginas sobre música, artistas e gêneros. Explore grupos de fãs e conteúdos por interesse e rede.'],
  'entretenimento-geral': ['Grupos de memes, figurinhas e entretenimento', 'Encontre comunidades de memes, figurinhas, humor e entretenimento. Conheça as apresentações e escolha o assunto do seu interesse.'],
  'financas-investimentos': ['Comunidades de finanças e investimentos', 'Explore grupos e conteúdos sobre finanças, investimentos e criptomoedas. Avalie a finalidade de cada comunidade sem promessa de rendimento.'],
  'politica-sociedade': ['Grupos de notícias, política e sociedade', 'Conheça comunidades de notícias e conversas sobre política e sociedade. Encontre apresentações por assunto e rede.'],
  'apps-redes-plataformas': ['Comunidades de apps, redes e criadores', 'Encontre grupos e páginas de criadores de conteúdo, aplicativos e redes sociais. Explore aprendizagem, divulgação e troca de experiências.'],
  'animes-nerd-geek': ['Grupos de anime, mangá e cultura geek', 'Descubra comunidades de anime, mangá e cultura nerd e geek. Encontre grupos e servidores por assunto e rede.'],
  'amizade-relacionamentos': ['Grupos de amizade, namoro e conversa', 'Encontre comunidades de amizade, relacionamento e conversa. Conheça as apresentações dos grupos e escolha o tema e a rede do seu interesse.'],
  'servicos-profissionais': ['Grupos de emprego, freelancers e networking', 'Explore comunidades de vagas, freelancers e networking, além de serviços profissionais. Conheça a especialidade e a proposta de cada publicação.'],
}

export function facetCopy(kind: 'niche' | 'network', slug: string, name: string): { title: string; description: string; explicit: boolean } {
  const copy = (kind === 'network' ? networks : niches)[slug]
  return {
    title: copy?.[0] ?? `Links de ${name}`,
    description: copy?.[1] ?? `Explore links e apresentações de ${name} publicados no catálogo. Conheça cada proposta e encontre conteúdos do seu interesse.`,
    explicit: kind === 'niche' ? slug === 'adulto' : ['privacy', 'onlyfans', 'fansly'].includes(slug),
  }
}

export function facetExplicit(state:SeoEditorial,kind:'niche'|'network',slug:string,name:string):boolean {
  const configured=state.facets[`${kind}:${slug}`]
  return facetCopy(kind,slug,name).explicit || Boolean(configured?.approved&&configured.explicit)
}
