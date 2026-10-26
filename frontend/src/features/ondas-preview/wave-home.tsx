'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { ActionIcon } from '@/components/ui/action-icon'
import { Select } from '@/components/ui/select'
import { PreviewPhoto, PreviewNetworkBadge } from '@/features/home-preview/glass-link-card'
import { filterPreviewLinks, networkLabels, previewLinks, previewNiches } from '@/features/home-preview/preview-data'
import { usePreviewFavorites } from '@/features/home-preview/use-preview-favorites'
import { WaveFrame } from './wave-frame'
import { LiquidLens } from './liquid-lens'
import { WaveFacetIcon } from './wave-facet-icon'
import { WaveLinkCard, waveDetailHref } from './wave-link-card'
import styles from '@/features/catalog/components/ondas-catalog.module.css'

const collections = [
  { niche: 'Viagens e aventura', title: 'Um novo horizonte.', slug: 'mochila-e-mundo' },
  { niche: 'Música', title: 'A sua próxima descoberta.', slug: 'frequencia-indie' },
  { niche: 'Gastronomia', title: 'Boas ideias à mesa.', slug: 'mesa-compartilhada' },
] as const

export function WaveHome() {
  const [draft, setDraft] = useState(''), [query, setQuery] = useState(''), [niche, setNiche] = useState('Todos'), [network, setNetwork] = useState(''), [order, setOrder] = useState('recent'), [favoritesOnly, setFavoritesOnly] = useState(false), [notice, setNotice] = useState(''), [showSuggestions, setShowSuggestions] = useState(false)
  const { favorites, toggle } = usePreviewFavorites()
  const resultsRef = useRef<HTMLDivElement>(null)
  const links = filterPreviewLinks({ query, niche, network, order, favoritesOnly }, favorites)
  const featured = links.filter(link => link.sponsored), organic = links.filter(link => !link.sponsored)
  const suggestions = filterPreviewLinks({ query: draft, niche: 'Todos', network: '', order: 'views', favoritesOnly: false }, favorites).filter(link => draft.trim() || !link.sponsored).slice(0, 3)
  const active = !!query || niche !== 'Todos' || !!network || favoritesOnly
  function clear() { setDraft(''); setQuery(''); setNiche('Todos'); setNetwork(''); setFavoritesOnly(false) }
  function favorite(slug: string) { if (!toggle(slug)) setNotice('Não foi possível salvar. O navegador bloqueou o armazenamento local.') }
  function exploreCollection(topic: string) { clear(); setNiche(topic); resultsRef.current?.scrollIntoView({ block: 'start' }); resultsRef.current?.focus({ preventScroll: true }) }
  return <WaveFrame>
    <section className={styles.hero} aria-labelledby="wave-title">
      <div className={styles.heroCopy}><h1 id="wave-title">Encontre seu <em>próximo link.</em></h1><p>Grupos, canais e conteúdos do seu interesse.</p></div>

      <form className={styles.search} role="search" aria-label="Buscar links nesta home" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setShowSuggestions(false) }} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.currentTarget.querySelector('input')?.focus(); setShowSuggestions(false) } }} onSubmit={event => { event.preventDefault(); setQuery(draft.trim()); setShowSuggestions(false); resultsRef.current?.scrollIntoView({ block: 'start' }) }}><LiquidLens radius={20} /><ActionIcon name="search" width="24" height="24" /><label className={styles.srOnly} htmlFor="wave-search">O que você quer encontrar?</label><input id="wave-search" type="search" autoComplete="off" placeholder="Busque por nome, assunto ou comunidade" value={draft} onFocus={() => setShowSuggestions(true)} onChange={event => { setDraft(event.target.value); setShowSuggestions(true) }} />
        {showSuggestions ? <section className={styles.suggestions} aria-label="Sugestões de busca"><LiquidLens radius={18} /><div className={styles.suggestionHeading}><strong>{draft.trim() ? 'Links relacionados à busca' : 'Sugestões para explorar'}</strong><span aria-live="polite">{suggestions.length} {suggestions.length === 1 ? 'sugestão' : 'sugestões'}</span></div>{suggestions.length ? <ul>{suggestions.map(link => <li key={link.slug}><Link href={waveDetailHref(link.slug)} aria-label={`Abrir sugestão ${link.title}`}><span className={styles.suggestionIcon}><WaveFacetIcon value={link.niche} size={23} /></span><span><strong>{link.title}</strong><small>{link.niche}{link.sponsored ? ' · Patrocinado' : ''}</small></span><PreviewNetworkBadge link={link} /><ActionIcon name="next" width="18" height="18" /></Link></li>)}</ul> : <p className={styles.suggestionEmpty}>Nenhuma sugestão. Pressione Enter para ver os resultados da busca.</p>}<p className={styles.suggestionHint}>Enter para buscar · Tab para percorrer sugestões · Esc para fechar</p></section> : null}
      </form>
      <div className={styles.heroNetworks}><span>Explore no</span>{Object.entries(networkLabels).slice(0, 3).map(([key, label]) => <button key={key} type="button" aria-pressed={network === key} onClick={() => { setNetwork(network === key ? '' : key); resultsRef.current?.scrollIntoView({ block: 'start' }) }}><LiquidLens radius={999} />{label}<ActionIcon name="next" width="13" height="13" /></button>)}</div>
    </section>
    <nav className={styles.topics} aria-label="Explorar por nicho">{previewNiches.map(topic => <button key={topic} type="button" aria-pressed={niche === topic} onClick={() => setNiche(topic)}><LiquidLens radius={999} /><WaveFacetIcon value={topic} />{topic === 'Todos' ? 'Para descobrir' : topic}</button>)}</nav>
    <div ref={resultsRef} className={styles.resultsAnchor} tabIndex={-1} role="region" aria-label="Resultados da busca">
      {featured.length ? <section className={styles.featuredSection} aria-labelledby="wave-featured"><div className={styles.sectionHeading}><div><h2 id="wave-featured">Na crista da onda.</h2><p>Links em destaque para você conhecer.</p></div><span className={styles.sponsorNote}><ActionIcon name="promotion" width="16" height="16" />Espaços patrocinados</span></div><div className={styles.featuredGrid}>{featured.map(link => <WaveLinkCard key={link.slug} link={link} featured saved={favorites.includes(link.slug)} onFavorite={() => favorite(link.slug)} />)}</div></section> : null}
      <section className={styles.catalogSection} aria-labelledby="wave-catalog"><div className={styles.sectionHeading}><div><h2 id="wave-catalog">Mergulhe no catálogo.</h2><p role="status">{links.length} {links.length === 1 ? 'link encontrado' : 'links para explorar'} nesta demonstração</p></div><button type="button" className={styles.favoriteFilter} aria-pressed={favoritesOnly} onClick={() => setFavoritesOnly(!favoritesOnly)}><LiquidLens radius={12} /><ActionIcon name="star" width="18" height="18" />Favoritos <span>{favorites.length}</span></button></div>
        <div className={styles.filterBar}><div className={styles.selects}><div className={styles.selectGlass}><Select aria-label="Filtrar por rede" value={network} onChange={event => setNetwork(event.target.value)} className={styles.select} popupClassName={styles.selectPopup} triggerBackdrop={<LiquidLens radius={12} />} popupBackdrop={<LiquidLens radius={16} />}><option value="">Todas as redes</option>{Object.entries(networkLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></div><div className={styles.selectGlass}><Select aria-label="Ordenar links" value={order} onChange={event => setOrder(event.target.value)} className={styles.select} popupClassName={styles.selectPopup} triggerBackdrop={<LiquidLens radius={12} />} popupBackdrop={<LiquidLens radius={16} />}><option value="recent">Ordem do catálogo</option><option value="views">Mais visualizados</option></Select></div></div><span>Seu próximo interesse pode estar aqui.</span></div>
        {active ? <div className={styles.filterSummary}><span>{query ? `“${query}” · ` : ''}{niche === 'Todos' ? 'Todos os assuntos' : niche}{network ? ` · ${networkLabels[network as keyof typeof networkLabels]}` : ''}{favoritesOnly ? ' · Favoritos' : ''}</span><button type="button" onClick={clear}><LiquidLens radius={12} />Limpar filtros<ActionIcon name="close" width="14" height="14" /></button></div> : null}
        <div className={styles.cardGrid}>{organic.map(link => <WaveLinkCard key={link.slug} link={link} saved={favorites.includes(link.slug)} onFavorite={() => favorite(link.slug)} />)}</div>
        {!links.length ? <div className={styles.empty}><LiquidLens radius={16} /><ActionIcon name="search" width="30" height="30" /><h3>Nenhum link nesta seleção.</h3><p>Mude o assunto ou combine menos filtros para continuar descobrindo.</p><button type="button" className={styles.primary} onClick={clear}><LiquidLens radius={12} />Ver todos os links<ActionIcon name="next" width="18" height="18" /></button></div> : !organic.length ? <p className={styles.onlyFeatured}>Os links desta seleção estão nos destaques acima.</p> : null}
        <p className={styles.status} role="status">{notice}</p>
      </section>
    </div>
    <section className={styles.collections} aria-labelledby="wave-collections"><div className={styles.sectionHeading}><div><h2 id="wave-collections">Deixe a curiosidade levar.</h2><p>Escolha um assunto. Veja onde ele pode te levar.</p></div></div><div className={styles.collectionGrid}>{collections.map(collection => { const link = previewLinks.find(item => item.slug === collection.slug)!; return <button className={styles.collection} key={collection.niche} type="button" onClick={() => exploreCollection(collection.niche)}><span className={styles.collectionPhoto} data-collection-photo><PreviewPhoto link={link} /></span><span className={styles.collectionCopy}><LiquidLens radius={16} /><span><small><WaveFacetIcon value={collection.niche} />{collection.niche}</small><strong>{collection.title}</strong></span><ActionIcon name="next" width="22" height="22" /></span></button> })}</div></section>
    <aside className={styles.publish}><LiquidLens radius={24} /><div className={styles.publishWaves} aria-hidden="true"><i /><i /><i /></div><div><h2>A sua comunidade<br />também tem lugar aqui.</h2><p>Compartilhe seu grupo, canal ou conteúdo.<br />Publicar é grátis. Destaques são espaços pagos.</p></div><Link href="/divulgar" className={styles.primary}><LiquidLens radius={12} />Quero divulgar meu link<ActionIcon name="next" width="19" height="19" /></Link></aside>
  </WaveFrame>
}
