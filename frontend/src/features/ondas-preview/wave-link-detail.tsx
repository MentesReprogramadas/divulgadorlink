'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ActionIcon } from '@/components/ui/action-icon'
import { PreviewNetworkBadge, PreviewPhoto, PreviewViews } from '@/features/home-preview/glass-link-card'
import { networkLabels, previewLinks, type PreviewLink } from '@/features/home-preview/preview-data'
import { usePreviewFavorites } from '@/features/home-preview/use-preview-favorites'
import { WaveFrame } from './wave-frame'
import { LiquidLens } from './liquid-lens'
import { WaveFacetIcon } from './wave-facet-icon'
import { WaveLinkCard, waveHomeHref } from './wave-link-card'
import styles from '@/features/catalog/components/ondas-catalog.module.css'

export function WaveLinkDetail({ link }: { link: PreviewLink }) {
  const { favorites, toggle } = usePreviewFavorites()
  const [notice, setNotice] = useState('')
  const saved = favorites.includes(link.slug)
  const related = previewLinks.filter(item => !item.sponsored && item.slug !== link.slug).sort((a, b) => Number(b.niche === link.niche) - Number(a.niche === link.niche)).slice(0, 3)
  function favorite(slug: string) { if (!toggle(slug)) setNotice('Não foi possível salvar. O navegador bloqueou o armazenamento local.') }
  async function copyLink() { try { await navigator.clipboard.writeText(window.location.href); setNotice('Link desta demonstração copiado.') } catch { setNotice('Não foi possível copiar. Copie o endereço na barra do navegador.') } }
  return <WaveFrame detail>
    <nav className={styles.breadcrumb} aria-label="Caminho do link"><Link href={waveHomeHref}><ActionIcon name="back" width="18" height="18" />Catálogo</Link><span aria-hidden="true">/</span><span>{link.niche}</span></nav>
    <section className={styles.detailHero} aria-labelledby="wave-detail-title"><div className={styles.detailMedia}><LiquidLens radius={24} /><div className={styles.detailCover} data-detail-photo><PreviewPhoto link={link} priority /></div></div>
      <div className={styles.detailSummary} data-detail-content><LiquidLens radius={22} /><div className={styles.identity}><span className={styles.avatar} style={{ background: link.accent }}>{link.initials}</span><PreviewNetworkBadge link={link} /></div><h1 id="wave-detail-title">{link.title}</h1><p className={styles.detailIntro}>{link.description.split('. ')[0]}.</p><div className={styles.detailFacts}>{link.sponsored ? <span className={styles.sponsored}><ActionIcon name="promotion" width="14" height="14" />Patrocinado</span> : null}<span className={styles.niche}><WaveFacetIcon value={link.niche} />{link.niche}</span><span><ActionIcon name="city" width="16" height="16" />{link.location}</span><span><ActionIcon name="language" width="16" height="16" />Português</span><PreviewViews value={link.views} /></div><div className={styles.detailActions}><button type="button" className={styles.primary} onClick={() => setNotice(`Esta é uma demonstração. O acesso ao ${networkLabels[link.network]} não abre um destino real.`)}><LiquidLens radius={12} />Acessar {link.category === 'Comunidade' ? 'comunidade' : link.category === 'Canal' ? 'canal' : 'conteúdo'}<ActionIcon name="external" width="20" height="20" /></button><button type="button" className={styles.detailFavorite} aria-label={`${saved ? 'Remover' : 'Salvar'} ${link.title} ${saved ? 'dos' : 'nos'} favoritos`} aria-pressed={saved} onClick={() => favorite(link.slug)}><LiquidLens radius={12} /><ActionIcon name="star" fill={saved ? 'currentColor' : 'none'} /></button></div><p className={styles.detailHint}>Prévia visual: o botão de acesso é uma simulação.<br />Favoritos ficam salvos apenas neste navegador.</p><p role="status" className={styles.detailStatus}>{notice}</p></div>
    </section>
    <div className={styles.detailInformation}><section className={styles.about} aria-labelledby="wave-about"><LiquidLens radius={22} /><h2 id="wave-about">Sobre {link.category === 'Comunidade' ? 'a comunidade' : link.category === 'Canal' ? 'o canal' : 'o conteúdo'}</h2><p>{link.description}</p><h3>O que você encontra por lá</h3><ul>{link.highlights.map(item => <li key={item}><ActionIcon name="check" width="18" height="18" />{item}</li>)}</ul><div className={styles.interestTags}>{[link.niche, link.category, networkLabels[link.network]].map(tag => <span key={tag}><LiquidLens radius={999} /><WaveFacetIcon value={tag} />{tag}</span>)}</div></section>
      <aside className={styles.information} aria-labelledby="wave-information"><LiquidLens radius={16} /><h2 id="wave-information">Detalhes</h2><dl><div><dt>Rede</dt><dd>{networkLabels[link.network]}</dd></div><div><dt>Assunto</dt><dd>{link.niche}</dd></div><div><dt>Tipo</dt><dd>{link.category}</dd></div><div><dt>Localização</dt><dd>{link.location}</dd></div><div><dt>Idioma</dt><dd>Português</dd></div></dl><button type="button" className={styles.copyButton} onClick={copyLink}><LiquidLens radius={12} /><ActionIcon name="copy" width="18" height="18" />Copiar link</button><details className={styles.report}><summary><ActionIcon name="report" width="16" height="16" />Encontrou um problema?</summary><p>Na versão real, você poderá denunciar um link para análise. Esta demonstração não envia denúncias.</p></details><p className={styles.informationHint}>Dados e visualizações ilustrativos. Disponibilidade, moderação e elegibilidade comercial não são confirmadas nesta prévia.</p></aside>
    </div>
    <section className={styles.related} aria-labelledby="wave-related"><div className={styles.sectionHeading}><div><h2 id="wave-related">A descoberta continua.</h2><p>Outros links para explorar, no seu tempo.</p></div><Link href={waveHomeHref}>Voltar ao catálogo<ActionIcon name="next" width="18" height="18" /></Link></div><div className={styles.cardGrid}>{related.map(item => <WaveLinkCard key={item.slug} link={item} saved={favorites.includes(item.slug)} onFavorite={() => favorite(item.slug)} />)}</div></section>
  </WaveFrame>
}
