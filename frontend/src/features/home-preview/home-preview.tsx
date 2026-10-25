'use client'
import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ActionIcon } from '@/components/ui/action-icon'
import { Select } from '@/components/ui/select'
import { nicheIcon } from '@/domain/niche-icons'
import { GlassLinkCard } from './glass-link-card'
import { filterPreviewLinks, networkLabels, previewNiches, type PreviewFilters, type PreviewNetwork } from './preview-data'
import { PreviewFrame } from './preview-frame'
import { usePreviewFavorites } from './use-preview-favorites'
import styles from './home-preview.module.css'

const topicIcons: Record<string, string> = { Tecnologia: 'tecnologia-internet', Música: 'musicas', Jogos: 'jogos', 'Educação e leitura': 'educacao-cursos' }

export function HomePreview() {
  const router = useRouter(), params = useSearchParams()
  const [draft, setDraft] = useState(params.get('q') ?? '')
  const [pending, startTransition] = useTransition()
  const [notice, setNotice] = useState('')
  const { favorites, toggle } = usePreviewFavorites()
  const filters: PreviewFilters = { query: params.get('q') ?? '', niche: params.get('nicho') ?? 'Todos', network: params.get('rede') ?? '', favoritesOnly: params.get('favoritos') === '1', order: params.get('ordem') ?? 'recent' }
  const links = filterPreviewLinks(filters, favorites)
  const sponsored = links.filter(link => link.sponsored), organic = links.filter(link => !link.sponsored)
  const hasFilter = Boolean(filters.query || filters.niche !== 'Todos' || filters.network || filters.favoritesOnly)
  function changeFilter(key: string, value: string) {
    const next = new URLSearchParams(params.toString())
    if (value) next.set(key, value); else next.delete(key)
    startTransition(() => router.replace(`/dev/home-preview${next.size ? `?${next}` : ''}`, { scroll: false }))
  }
  function favorite(slug: string) { if (!toggle(slug)) setNotice('O navegador não permitiu salvar o favorito local. Tente habilitar o armazenamento.') }
  return <PreviewFrame>
    <section className={styles.hero} aria-labelledby="catalog-title"><div className={styles.heroIntro}><h1 id="catalog-title">Tem um link<br className={styles.mobileBreak} /> para o seu mundo.</h1><p>Descubra grupos, canais, sites e boas ideias.<br />Tudo organizado para você encontrar o que combina com você.</p></div>
      <form className={styles.search} role="search" aria-label="Buscar no catálogo de demonstração" onSubmit={event => { event.preventDefault(); changeFilter('q', draft.trim()) }}><div className={styles.searchGlass} aria-hidden="true" /><ActionIcon name="search" width="25" height="25" /><label className={styles.srOnly} htmlFor="preview-search">O que você quer encontrar?</label><input id="preview-search" type="search" placeholder="Uma comunidade, um assunto, um novo interesse..." value={draft} onChange={event => setDraft(event.target.value)} />{draft ? <button type="button" className={styles.clearSearch} aria-label="Limpar busca" onClick={() => { setDraft(''); changeFilter('q', '') }}><ActionIcon name="close" width="17" height="17" /></button> : null}<button type="submit" className={styles.searchSubmit}>Explorar <ActionIcon name="next" width="19" height="19" /></button></form>
      <div className={styles.searchHints}><span>Experimente</span>{['Tecnologia', 'Música', 'Viagens e aventura'].map(topic => <button type="button" key={topic} onClick={() => changeFilter('nicho', topic)}>{topic}</button>)}</div>
    </section>
    <div className={styles.catalogBody}>
      <nav className={styles.topicNavigation} aria-label="Explorar por nicho">{previewNiches.map(topic => { const icon = topicIcons[topic] ? nicheIcon(topicIcons[topic]) : null; return <button type="button" key={topic} aria-pressed={filters.niche === topic} onClick={() => changeFilter('nicho', topic === 'Todos' ? '' : topic)}>{icon ? <img src={icon} width="18" height="18" alt="" /> : null}{topic === 'Todos' ? 'Para descobrir' : topic}</button> })}</nav>
      {sponsored.length > 0 ? <section className={styles.featuredSection} aria-labelledby="featured-heading"><div className={styles.sectionHeading}><div><span className={styles.sectionSymbol}><ActionIcon name="promotion" /></span><div><h2 id="featured-heading">Links em destaque</h2><p>Links em destaque no catálogo</p></div></div><span className={styles.paidNote}>Espaços patrocinados</span></div><div className={styles.featuredGrid}>{sponsored.map((link, index) => <GlassLinkCard key={link.slug} link={link} featured priority={index === 0} saved={favorites.includes(link.slug)} onFavorite={() => favorite(link.slug)} />)}</div></section> : null}
      <section className={styles.resultsSection} aria-labelledby="results-heading" aria-busy={pending}><div className={styles.sectionHeading}><div><div><h2 id="results-heading">{hasFilter ? 'O seu próximo encontro.' : 'Explore o catálogo'}</h2><p role="status">{links.length} {links.length === 1 ? 'link encontrado' : 'links para explorar'} nesta demonstração</p></div></div><button type="button" className={styles.favoritesFilter} aria-pressed={filters.favoritesOnly} onClick={() => changeFilter('favoritos', filters.favoritesOnly ? '' : '1')}><ActionIcon name="star" fill={filters.favoritesOnly ? 'currentColor' : 'none'} /> Favoritos <span>{favorites.length}</span></button></div>
        <div className={styles.filterRow}><div><span>Encontre do seu jeito</span><Select aria-label="Filtrar por rede" className={styles.filterSelect} value={filters.network} onChange={event => changeFilter('rede', event.target.value)}><option value="">Todas as redes</option>{Object.entries(networkLabels).map(([value, label]) => <option key={value} value={value as PreviewNetwork}>{label}</option>)}</Select></div><Select aria-label="Ordenar links" className={styles.filterSelect} value={filters.order} onChange={event => changeFilter('ordem', event.target.value)}><option value="recent">Seleção da demo</option><option value="views">Mais visualizados</option></Select></div>
        {hasFilter ? <div className={styles.activeFilters}><span>{filters.niche !== 'Todos' ? filters.niche : 'Todos os nichos'}{filters.query ? ` · “${filters.query}”` : ''}</span><button type="button" onClick={() => { setDraft(''); startTransition(() => router.replace('/dev/home-preview', { scroll: false })) }}>Limpar filtros <ActionIcon name="close" width="14" height="14" /></button></div> : null}
        <div className={styles.linkGrid}>{organic.map(link => <GlassLinkCard key={link.slug} link={link} saved={favorites.includes(link.slug)} onFavorite={() => favorite(link.slug)} />)}</div>
        {links.length === 0 ? <div className={styles.emptyState}><ActionIcon name="search" width="30" height="30" /><h3>Nenhum link por aqui ainda.</h3><p>Experimente outro termo, nicho ou rede. Há outros caminhos para descobrir.</p><button type="button" onClick={() => { setDraft(''); router.replace('/dev/home-preview', { scroll: false }) }}>Ver todos os links</button></div> : organic.length === 0 ? <p className={styles.resultsNote}>Os links desta seleção estão na faixa de destaques acima.</p> : null}
        <p className={styles.localStatus} role="status">{notice}</p>
      </section>
      <aside className={styles.publishInvitation}><div><span>Seu link também pode estar aqui.</span><h2>Conecte o que você faz<br />a quem se interessa.</h2></div><div><p>Publicar é grátis. Esta é uma prévia de apresentação.</p><a href="/divulgar">Conhecer a publicação <ActionIcon name="next" width="18" height="18" /></a></div></aside>
    </div>
  </PreviewFrame>
}
