import { Skeleton, SkeletonRegion } from '@/components/feedback/skeleton'
import type { ReactNode } from 'react'
import { CatalogGrid } from '@/components/domain/catalog-grid'
import card from '@/components/domain/link-row.module.css'
import home from '@/app/home.module.css'
import styles from './catalog-skeleton.module.css'
import {DiscoveryFieldsSkeleton} from '@/features/catalog/discovery/discovery-skeleton'

export function CatalogCardSkeleton({ actions, withFavorite = true,withImpressions=true }: { actions?: ReactNode; withFavorite?: boolean;withImpressions?:boolean }) {
  return <div className={card.card}>
    {withFavorite ? <div className={card.cornerAction}><Skeleton width={24} height={24} /></div> : null}
    <div className={`${card.name} ${withFavorite ? card.withCorner : ''}`}><Skeleton width="70%" height={28} /></div>
    <div className={card.description}><Skeleton height={21} /><Skeleton width="85%" height={21} /></div>
    <div className="link-meta"><Skeleton width={90} height={26} /><Skeleton width={80} height={26} /></div>
    {actions ? <div className={card.cardActions}>{actions}</div> : null}
    <div className={card.footer}>{withImpressions?<Skeleton width={60} height={20} />:null}<span className={card.action}><Skeleton width={80} height={20} /></span></div>
  </div>
}
export function CatalogCardsSkeleton({ count = 6, withFavorite = true }: { count?: number; withFavorite?: boolean }) {
  return <SkeletonRegion label="Carregando links"><CatalogGrid>{Array.from({ length: count }, (_, i) => <CatalogCardSkeleton key={i} withFavorite={withFavorite} />)}</CatalogGrid></SkeletonRegion>
}
export function SearchSkeleton() {
  return <main className="search-page"><SkeletonRegion><div className={styles.stack}><Skeleton width={80} height={44} /><h1 className="entry-title">Buscar</h1><Skeleton width="55%" height={24} /><div className="search-form"><Skeleton height={50} /></div></div></SkeletonRegion><DiscoveryFieldsSkeleton mode="filters"/><CatalogCardsSkeleton /></main>
}
export function HomeSkeleton() {
  return <main className={home.page}><div className={home.layout}>
    <section className={`home-masthead ${home.masthead}`}><div><h1 className="entry-title">Encontre o que você procura.</h1><p className="home-description">Links, comunidades e serviços organizados por tema e rede.</p></div><div className="home-search"><Skeleton height={50} /></div></section>
    <section className={`home-explore ${home.explore}`}><h2 className="home-explore-title">Explorar</h2><SkeletonRegion><div className={styles.explore}>{[0, 1].map(i => <div key={i} className={styles.stack}><Skeleton width="45%" height={24} /><div className={styles.facets}>{[0, 1, 2, 3].map(n => <Skeleton key={n} width={110} height={44} />)}</div></div>)}</div></SkeletonRegion></section>
    <DiscoveryFieldsSkeleton mode="filters"/>
    <div className={styles.results}><Skeleton width={150} height={28} /><CatalogCardsSkeleton /></div>
  </div></main>
}
export function RelatedSkeleton() { return <section className={styles.results}><h2>Links relacionados</h2><CatalogCardsSkeleton count={3} withFavorite={false} /></section> }
