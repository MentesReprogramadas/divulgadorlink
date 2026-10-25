'use client'
import { useState } from 'react'
import Link from 'next/link'
import { directionHref, homeDirections } from './directions'
import styles from './home-directions.module.css'

export function HomeDirectionGallery() {
  const [family, setFamily] = useState('Todas')
  const families = ['Todas', ...new Set(homeDirections.map(direction => direction.family))]
  const visible = homeDirections.filter(direction => family === 'Todas' || direction.family === family)
  return <main className={styles.gallery} aria-labelledby="directions-title">
    <header className={styles.galleryIntro}><h1 id="directions-title">Um catálogo.<br />Muitos universos.</h1><div><p>Do silêncio ao movimento. Da fotografia à matéria.<br />Abra cada home e descubra qual combina com o Tem Link Aqui.</p><span>{homeDirections.length} direções + Liquid Glass</span></div></header>
    <nav className={styles.galleryFilters} aria-label="Filtrar estilos">{families.map(item => <button type="button" key={item} aria-pressed={family === item} onClick={() => setFamily(item)}>{item}</button>)}</nav><div className={styles.galleryGrid}>{visible.map((direction, index) => <Link className={styles.galleryCard} href={directionHref(direction.id)} key={direction.id}><div className={styles.galleryImage}><img src={`/home-directions/${direction.id}.jpg`} alt={`Prévia da home ${direction.name}`} width="1440" height="1080" loading={index < 3 ? 'eager' : 'lazy'} /><span>{direction.family}</span></div><div className={styles.galleryCardInfo}><h2>{direction.name}</h2><p>{direction.description}</p><span>Explorar esta direção <span aria-hidden="true">↗</span></span></div></Link>)}</div>
    <Link href="/dev/home-preview" className={styles.originalDirection}><div><h2>Liquid Glass</h2><p>Vidro sobre fotografia, reflexos e atmosfera navy/turquesa.</p></div><span>Abrir home <span aria-hidden="true">↗</span></span></Link>
    <p className={styles.galleryFootnote}>Todas as homes são demonstrações com os mesmos nove links fictícios. Busca, nichos, redes e favoritos funcionam localmente. Use Anterior e Próxima para comparar uma por uma.</p>
  </main>
}
