'use client'
import Link from 'next/link'
import { useRef, useState, type PointerEvent } from 'react'
import { ActionIcon } from '@/components/ui/action-icon'
import { Select } from '@/components/ui/select'
import { networkLogo } from '@/domain/network-logos'
import { filterPreviewLinks, networkLabels, previewLinks, previewNiches, type PreviewLink } from '@/features/home-preview/preview-data'
import { PreviewPhoto } from '@/features/home-preview/glass-link-card'
import { usePreviewFavorites } from '@/features/home-preview/use-preview-favorites'
import { DirectionBackdrop } from './direction-backdrop'
import { directionHref, homeDirections, type DirectionId, type HomeDirection } from './directions'
import styles from './home-directions.module.css'
import worlds from './new-home-directions.module.css'

function HeroArtwork({ id }: { id: DirectionId }) {
  const count = ['metal', 'holografica', 'galeria', 'cinetica', 'constelacao', 'seda', 'cromatica', 'arquivo', 'terminal', 'bauhaus', 'atlas'].includes(id) ? 0 : ['organica', 'ondas', 'editorial', 'brutalista'].includes(id) ? 1 : 3
  return <div className={styles.artwork} data-part="artwork" aria-hidden="true"><div className={styles.sculpture} data-art="sculpture"><i /><i /><i /></div><div className={styles.orbitRing} data-art="ring" /><div className={styles.artPhotos} data-art="photos">{previewLinks.slice(0, count).map((link, index) => <div className={styles.artPhoto} data-art="photo" key={link.slug}><PreviewPhoto link={link} priority={index === 0} /><span>{link.niche}</span></div>)}</div></div>
}

function DirectionCard({ link, direction, saved, onFavorite, featured }: { link: PreviewLink; direction: HomeDirection; saved: boolean; onFavorite: () => void; featured: boolean }) {
  const ref = useRef<HTMLElement>(null)
  const href = `/dev/home-preview/link/${link.slug}?home=${direction.id}`
  const logo = networkLogo(link.network)
  function move(event: PointerEvent<HTMLElement>) {
    const element = ref.current
    if (!element || event.pointerType === 'touch' || element.closest('[data-motion="paused"]') || window.matchMedia('(prefers-reduced-motion: reduce), (hover: none)').matches) return
    const box = element.getBoundingClientRect(), x = (event.clientX - box.left) / box.width - .5, y = (event.clientY - box.top) / box.height - .5
    element.style.setProperty('--pointer-x', `${(x + .5) * 100}%`); element.style.setProperty('--pointer-y', `${(y + .5) * 100}%`)
    if (direction.id === 'magnetica') { element.style.setProperty('--pull-x', `${x * 12}px`); element.style.setProperty('--pull-y', `${y * 10}px`) }
    if (direction.id === 'orbita' || direction.id === 'holografica') { element.style.setProperty('--tilt-x', `${-y * 5}deg`); element.style.setProperty('--tilt-y', `${x * 6}deg`) }
  }
  function reset() { for (const name of ['--pointer-x', '--pointer-y', '--pull-x', '--pull-y', '--tilt-x', '--tilt-y']) ref.current?.style.removeProperty(name) }
  return <article ref={ref} className={styles.linkCard} data-part="card" data-featured={featured || undefined} data-link={link.slug} onPointerMove={move} onPointerLeave={reset} onPointerCancel={reset}>
    <div className={styles.cardPhoto} data-part="card-photo"><Link href={href} tabIndex={-1}><PreviewPhoto link={link} /></Link><span className={styles.cardNiche}>{link.niche}</span>{link.sponsored ? <span className={styles.sponsored}><ActionIcon name="promotion" width="13" height="13" />Patrocinado</span> : null}</div>
    <button type="button" className={styles.saveButton} aria-label={`${saved ? 'Remover' : 'Salvar'} ${link.title} ${saved ? 'dos' : 'nos'} favoritos`} aria-pressed={saved} onClick={onFavorite}><ActionIcon name="star" fill={saved ? 'currentColor' : 'none'} /></button>
    <div className={styles.cardCopy} data-part="card-copy"><div className={styles.cardMeta}><span>{logo ? <img src={logo} alt="" width="17" height="17" /> : null}{networkLabels[link.network]}</span><span>{direction.id === 'terminal' ? `${link.niche} · ${link.category}` : link.category}</span>{link.sponsored && direction.id === 'terminal' ? <strong className={styles.inlineSponsor}>Patrocinado</strong> : null}</div><h3><Link href={href}>{link.title}</Link></h3><p>{link.description}</p><div className={styles.cardFoot}><span role="img" aria-label={`${link.views.toLocaleString('pt-BR')} visualizações ilustrativas`}><ActionIcon name="eye" width="16" height="16" /><span aria-hidden="true">{new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(link.views)}</span></span><Link href={href} aria-label={`Conhecer ${link.title}`}><span>Conhecer</span><ActionIcon name="next" width="18" height="18" /></Link></div></div>
  </article>
}

export function DirectionHome({ direction }: { direction: HomeDirection }) {
  const [paused, setPaused] = useState(false), [query, setQuery] = useState(''), [draft, setDraft] = useState(''), [niche, setNiche] = useState('Todos'), [network, setNetwork] = useState(''), [favoritesOnly, setFavoritesOnly] = useState(false), [notice, setNotice] = useState('')
  const { favorites, toggle } = usePreviewFavorites()
  const links = filterPreviewLinks({ query, niche, network, favoritesOnly, order: 'recent' }, favorites)
  const sponsored = links.filter(link => link.sponsored), organic = links.filter(link => !link.sponsored)
  const index = homeDirections.findIndex(item => item.id === direction.id)
  const previous = homeDirections[(index + homeDirections.length - 1) % homeDirections.length], next = homeDirections[(index + 1) % homeDirections.length]
  function clear() { setDraft(''); setQuery(''); setNiche('Todos'); setNetwork(''); setFavoritesOnly(false) }
  function favorite(slug: string) { if (!toggle(slug)) setNotice('O navegador não permitiu salvar este favorito local.') }
  return <main className={`${styles.page} ${index >= 12 ? worlds.newWorld : ''}`} data-style={direction.id} data-motion={paused ? 'paused' : 'running'} aria-label={`Home ${direction.name}`}>
    <DirectionBackdrop id={direction.id} paused={paused} />
    <nav className={styles.reviewBar} data-part="review-bar" aria-label="Comparar direções"><Link href="/dev/homes">Todas as homes</Link><div><Link href={directionHref(previous.id)} aria-label={`Home anterior: ${previous.name}`}><ActionIcon name="back" width="15" height="15" /><span>Anterior</span></Link><span>{index + 1} / {homeDirections.length} <b>{direction.name}</b></span><Link href={directionHref(next.id)} aria-label={`Próxima home: ${next.name}`}><span>Próxima</span><ActionIcon name="next" width="15" height="15" /></Link></div><button type="button" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? 'Retomar animações' : 'Pausar animações'}</button></nav>
    <section className={styles.hero} data-part="hero" aria-labelledby="direction-title"><div className={styles.heroCopy} data-part="hero-copy"><h1 id="direction-title">{direction.headline.map(line => <span key={line}>{line}</span>)}</h1><p>{direction.invitation}</p><form className={styles.search} data-part="search" role="search" aria-label="Buscar links nesta home" onSubmit={event => { event.preventDefault(); setQuery(draft.trim()) }}><ActionIcon name="search" width="23" height="23" /><label className={styles.srOnly} htmlFor="direction-search">O que você quer encontrar?</label><input id="direction-search" type="search" placeholder="Um assunto, uma comunidade, uma ideia..." value={draft} onChange={event => setDraft(event.target.value)} /><button type="submit">Explorar <ActionIcon name="next" width="18" height="18" /></button></form></div><HeroArtwork id={direction.id} /></section>
    <div className={styles.ticker} data-part="ticker" aria-hidden="true"><div>{[0, 1].map(copy => <span key={copy}>Gente que cria. <i /> Ideias que conectam. <i /> Tem Link Aqui. <i /> Novos interesses. <i /> </span>)}</div></div>
    <div className={styles.catalog} data-part="catalog">
      <nav className={styles.topics} data-part="topics" aria-label="Explorar por nicho">{previewNiches.map(topic => <button type="button" key={topic} aria-pressed={niche === topic} onClick={() => setNiche(topic)}>{topic === 'Todos' ? 'Para descobrir' : topic}</button>)}</nav>
      {sponsored.length ? <section className={styles.featuredSection} aria-labelledby="direction-featured"><div className={styles.sectionHeading}><div><h2 id="direction-featured">Links em destaque</h2><p>Comunidades para conhecer hoje</p></div><span className={styles.sponsorNote}><ActionIcon name="promotion" width="15" height="15" />Espaços patrocinados</span></div><div className={styles.featuredGrid} data-part="featured-grid">{sponsored.map(link => <DirectionCard key={link.slug} link={link} direction={direction} featured saved={favorites.includes(link.slug)} onFavorite={() => favorite(link.slug)} />)}</div></section> : null}
      <section className={styles.results} aria-labelledby="direction-results"><div className={styles.sectionHeading}><div><h2 id="direction-results">Explore o catálogo</h2><p role="status">{links.length} {links.length === 1 ? 'link encontrado' : 'links para explorar'} nesta demonstração</p></div><div className={styles.resultControls}><Select aria-label="Filtrar por rede" className={styles.networkSelect} value={network} onChange={event => setNetwork(event.target.value)}><option value="">Todas as redes</option>{Object.entries(networkLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select><button className={styles.favoriteFilter} type="button" aria-pressed={favoritesOnly} onClick={() => setFavoritesOnly(!favoritesOnly)}><ActionIcon name="star" width="17" height="17" />Favoritos <span>{favorites.length}</span></button></div></div>
        {query || niche !== 'Todos' || network || favoritesOnly ? <div className={styles.filterSummary}><span>{query ? `“${query}” · ` : ''}{niche === 'Todos' ? 'Todos os assuntos' : niche}</span><button type="button" onClick={clear}>Limpar filtros <ActionIcon name="close" width="13" height="13" /></button></div> : null}
        <div className={styles.resultsGrid} data-part="results-grid">{organic.map(link => <DirectionCard key={link.slug} link={link} direction={direction} featured={false} saved={favorites.includes(link.slug)} onFavorite={() => favorite(link.slug)} />)}</div>
        {!links.length ? <div className={styles.empty}><h3>Nenhum link nesta seleção.</h3><p>Experimente outro assunto ou explore todos os links.</p><button type="button" onClick={clear}>Ver todos os links</button></div> : !organic.length ? <p className={styles.onlyFeatured}>Os links desta seleção estão nos destaques acima.</p> : null}<p className={styles.status} role="status">{notice}</p>
      </section>
      <aside className={styles.publish} data-part="publish"><div><p>Seu link também pode estar aqui.</p><h2>O que você faz merece<br />encontrar sua comunidade.</h2></div><Link href="/divulgar">Conhecer a publicação <ActionIcon name="next" width="18" height="18" /></Link><span>Publicar é grátis. Esta é uma demonstração visual.</span></aside>
      <footer className={styles.demoFooter}><span>Tem Link Aqui</span><p>Home {direction.name} · Dados fictícios · Imagens Unsplash</p><Link href="/dev/homes">Comparar outras homes</Link></footer>
    </div>
  </main>
}
