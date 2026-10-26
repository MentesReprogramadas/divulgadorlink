import { Skeleton, SkeletonRegion } from '@/components/feedback/skeleton'
import type { ReactNode } from 'react'
import { CatalogGrid } from '@/components/domain/catalog-grid'
import card from '@/components/domain/link-row.module.css'
import home from './ondas-catalog.module.css'
import { LiquidLens } from '@/components/ui/liquid-lens'
import styles from './catalog-skeleton.module.css'
import {DiscoveryFieldsSkeleton} from '@/features/catalog/discovery/discovery-skeleton'
import { HomeHeroCopy } from './home-hero-copy'

export function CatalogCardSkeleton({ actions, withFavorite = true,withImpressions=true }: { actions?: ReactNode; withFavorite?: boolean;withImpressions?:boolean }) {
  return <div className={card.card}><div className={card.body}><LiquidLens radius={20} />
    {withFavorite ? <div className={card.cornerAction}><Skeleton width={24} height={24} /></div> : null}
    <div className={`${card.name} ${withFavorite ? card.withCorner : ''}`}><Skeleton width="70%" height={28} /></div>
    <div className={card.description}><Skeleton height={21} /><Skeleton width="85%" height={21} /></div>
    <div className="link-meta"><Skeleton width={90} height={26} /><Skeleton width={80} height={26} /></div>
    {actions ? <div className={card.cardActions}>{actions}</div> : null}
    <div className={card.footer}>{withImpressions?<Skeleton width={60} height={20} />:null}<span className={card.action}><Skeleton width={80} height={20} /></span></div>
  </div></div>
}
export function CatalogCardsSkeleton({ count = 6, withFavorite = true }: { count?: number; withFavorite?: boolean }) {
  return <SkeletonRegion label="Carregando links"><CatalogGrid>{Array.from({ length: count }, (_, i) => <CatalogCardSkeleton key={i} withFavorite={withFavorite} />)}</CatalogGrid></SkeletonRegion>
}
export function SearchSkeleton() {
  return <main className="search-page"><SkeletonRegion><div className={styles.stack}><Skeleton width={80} height={44} /><h1 className="entry-title">Buscar</h1><Skeleton width="55%" height={24} /><div className="search-form"><Skeleton height={50} /></div></div></SkeletonRegion><DiscoveryFieldsSkeleton mode="filters"/><CatalogCardsSkeleton /></main>
}
export function HomeSkeleton() {
  return <main className={home.publicPage}>
    <section className={home.hero} aria-labelledby="home-title"><HomeHeroCopy /><SkeletonRegion label="Carregando busca"><div className={home.homeSearch}><Skeleton height={66} /></div><div className={home.heroNetworks}><span>Explore no</span>{[90, 90, 90].map((width, i) => <Skeleton key={i} width={width} height={40} />)}</div></SkeletonRegion></section>
    <SkeletonRegion><div className={home.topics}>{[0, 1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} width={110} height={40} />)}</div></SkeletonRegion>
    <section className={home.catalogSection} aria-labelledby="loading-catalog-title">
      <header className={home.sectionHeading}><div><h2 id="loading-catalog-title">Catálogo de links</h2><Skeleton width={140} height={24} /></div><Skeleton width={110} height={44} /></header>
      <SkeletonRegion label="Carregando filtros"><div className={home.catalogFilters}><div className={home.filterBar}><Skeleton width={220} height={44} /><span>Seu próximo interesse pode estar aqui.</span></div><Skeleton width={190} height={44} /></div></SkeletonRegion>
      <CatalogCardsSkeleton />
    </section>
  </main>
}
export function RelatedSkeleton() { return <section className={styles.results}><h2>Links relacionados</h2><CatalogCardsSkeleton count={3} withFavorite={false} /></section> }
