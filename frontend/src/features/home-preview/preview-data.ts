export type PreviewNetwork = 'whatsapp' | 'telegram' | 'discord' | 'youtube' | 'instagram'
export type PreviewLink = {
  slug: string
  title: string
  description: string
  niche: string
  nicheSlug: string
  category: 'Comunidade' | 'Canal' | 'Conteúdo'
  network: PreviewNetwork
  photo: string
  imageAlt: string
  sponsored: boolean
  views: number
  initials: string
  accent: string
  location: string
  highlights: readonly string[]
}

export const previewPhotos: Readonly<Record<string, string>> = {
  mountains: 'photo-1464822759023-fed622ff2c3b',
  music: 'photo-1493225457124-a3eb161ffa5f',
  technology: 'photo-1498050108023-c5249f4df085',
  travel: 'photo-1476514525535-07fb3b4ae5f1',
  coffee: 'photo-1447933601403-0c6688de566e',
  games: 'photo-1542751371-adc38448a05e',
  photography: 'photo-1452587925148-ce544e77e70d',
  food: 'photo-1555939594-58d7cb561ad1',
  reading: 'photo-1507842217343-583bb7270b66',
}
export function previewImageUrl(photo: string): string | null {
  const id = Object.hasOwn(previewPhotos, photo) ? previewPhotos[photo] : undefined
  return id ? `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1400&q=82` : null
}

export const previewLinks: readonly PreviewLink[] = [
  { slug: 'fora-do-roteiro', title: 'Fora do roteiro', description: 'Para quem troca o caminho de sempre por uma boa história. Compartilhe trilhas, roteiros e dicas de viagem com pessoas que também querem explorar mais, sem pressa e com respeito à natureza.', niche: 'Viagens e aventura', nicheSlug: 'outro', category: 'Comunidade', network: 'whatsapp', photo: 'mountains', imageAlt: 'Picos de montanhas iluminados pela luz do dia', sponsored: true, views: 12480, initials: 'fr', accent: '#c6e9d1', location: 'Brasil · Online', highlights: ['Roteiros compartilhados pela comunidade', 'Dicas para planejar a próxima viagem', 'Conversas sobre trilhas e natureza'] },
  { slug: 'frequencia-indie', title: 'Frequência indie', description: 'O próximo som que você vai colocar no repeat pode estar aqui. Lançamentos, playlists e conversas sobre música independente, do quarto de casa ao palco.', niche: 'Música', nicheSlug: 'musicas', category: 'Canal', network: 'telegram', photo: 'music', imageAlt: 'Banda tocando em um show com iluminação de palco', sponsored: true, views: 8350, initials: 'fi', accent: '#efc5ad', location: 'Brasil · Online', highlights: ['Descobertas e lançamentos', 'Playlists para diferentes momentos', 'Referências compartilhadas por ouvintes'] },
  { slug: 'codigo-aberto', title: 'Código aberto', description: 'Um espaço para aprender tecnologia em boa companhia. Projetos, dúvidas de programação, referências e conversas de quem está começando ou já constrói para a web.', niche: 'Tecnologia', nicheSlug: 'tecnologia-internet', category: 'Comunidade', network: 'discord', photo: 'technology', imageAlt: 'Notebook com código sobre uma mesa de trabalho', sponsored: true, views: 6920, initials: 'ca', accent: '#bfccff', location: 'Brasil · Online', highlights: ['Troca de conhecimento sobre desenvolvimento', 'Projetos e referências práticas', 'Perguntas para diferentes níveis de experiência'] },
  { slug: 'mochila-e-mundo', title: 'Mochila & mundo', description: 'Destinos incríveis, relatos sinceros e dicas que só quem esteve lá conhece. Uma comunidade para viajar melhor e transformar vontade de sair em novos caminhos.', niche: 'Viagens e aventura', nicheSlug: 'outro', category: 'Comunidade', network: 'whatsapp', photo: 'travel', imageAlt: 'Lago azul cercado por montanhas e vegetação', sponsored: false, views: 3240, initials: 'mm', accent: '#b9e1db', location: 'Brasil · Online', highlights: ['Relatos de viagem', 'Sugestões de destinos', 'Planejamento colaborativo'] },
  { slug: 'cafe-e-conversa', title: 'Café & conversa: uma pausa para boas ideias', description: 'Café passado, conversa sem pressa e uma ideia puxando a outra. Compartilhe métodos, descubra novos grãos e encontre quem também transforma a pausa em ritual.', niche: 'Gastronomia', nicheSlug: 'outro', category: 'Comunidade', network: 'telegram', photo: 'coffee', imageAlt: 'Grãos de café com luz quente e textura natural', sponsored: false, views: 1870, initials: 'cc', accent: '#e5ccb1', location: 'São Paulo / SP · Online', highlights: ['Métodos de preparo', 'Grãos e torrefações', 'Conversas sobre o ritual do café'] },
  { slug: 'checkpoint', title: 'Checkpoint — encontre sua próxima equipe', description: 'A próxima partida fica melhor em boa companhia. Encontre jogadores, troque recomendações e converse sobre os games que fazem parte da sua rotina.', niche: 'Jogos', nicheSlug: 'jogos', category: 'Comunidade', network: 'discord', photo: 'games', imageAlt: 'Jogadores em computadores durante uma competição de games', sponsored: false, views: 4680, initials: 'cp', accent: '#cdc7f5', location: 'Brasil · Online', highlights: ['Conversas sobre jogos', 'Encontros de jogadores', 'Recomendações da comunidade'] },
  { slug: 'olhar-cotidiano', title: 'Um olhar sobre o cotidiano', description: 'Histórias que cabem em uma fotografia. Composição, luz e referências para enxergar de outro jeito e compartilhar o que você encontra pelo caminho.', niche: 'Fotografia', nicheSlug: 'outro', category: 'Conteúdo', network: 'instagram', photo: 'photography', imageAlt: 'Câmera fotográfica e equipamento sobre uma superfície', sponsored: false, views: 2560, initials: 'oc', accent: '#bbd5ef', location: 'Brasil · Online', highlights: ['Referências visuais', 'Composição e luz', 'Processos de fotografia'] },
  { slug: 'mesa-compartilhada', title: 'Mesa compartilhada', description: 'Receitas que dão vontade de chamar todo mundo para perto. Uma seleção de ideias para cozinhar, experimentar e compartilhar os pequenos prazeres de uma boa mesa.', niche: 'Gastronomia', nicheSlug: 'outro', category: 'Canal', network: 'youtube', photo: 'food', imageAlt: 'Comida preparada e servida em uma mesa', sponsored: false, views: 5120, initials: 'mc', accent: '#efd3a6', location: 'Brasil · Online', highlights: ['Receitas para experimentar', 'Ingredientes e técnicas', 'Ideias para compartilhar a mesa'] },
  { slug: 'entre-paginas', title: 'Entre páginas e boas histórias', description: 'O livro termina, a conversa continua. Leituras compartilhadas, recomendações e um espaço para quem gosta de descobrir novas histórias em boa companhia.', niche: 'Educação e leitura', nicheSlug: 'educacao-cursos', category: 'Comunidade', network: 'whatsapp', photo: 'reading', imageAlt: 'Estantes de uma biblioteca cheias de livros', sponsored: false, views: 2140, initials: 'ep', accent: '#d6d5b8', location: 'Brasil · Online', highlights: ['Recomendações de leitura', 'Conversas sobre livros', 'Descoberta de autores'] },
]

export const networkLabels: Record<PreviewNetwork, string> = { whatsapp: 'WhatsApp', telegram: 'Telegram', discord: 'Discord', youtube: 'YouTube', instagram: 'Instagram' }
export const previewNiches = ['Todos', 'Viagens e aventura', 'Tecnologia', 'Música', 'Jogos', 'Gastronomia', 'Fotografia', 'Educação e leitura'] as const
export type PreviewFilters = { query: string; niche: string; network: string; favoritesOnly: boolean; order: string }
export function filterPreviewLinks(filters: PreviewFilters, favorites: readonly string[]): readonly PreviewLink[] {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
  const query = normalize(filters.query.trim())
  const links = previewLinks.filter(link => (filters.niche === 'Todos' || link.niche === filters.niche) && (!filters.network || link.network === filters.network) && (!filters.favoritesOnly || favorites.includes(link.slug)) && normalize(`${link.title} ${link.description} ${link.niche} ${link.category} ${networkLabels[link.network]}`).includes(query))
  return filters.order === 'views' ? [...links].sort((a, b) => b.views - a.views) : links
}

export function previewAvailable(mode: string | undefined): boolean { return mode === 'development' }
