'use client'

import { SearchBox } from '@/components/domain/search-box'
import styles from '@/features/catalog/components/ondas-catalog.module.css'

export function HomeSearch({discoveryQuery=''}:{discoveryQuery?:string}) {
  return (
    <form className={styles.homeSearch} action="/busca">
      <SearchBox id="home-search" label="Busca" discoveryQuery={discoveryQuery}/>
      {Array.from(new URLSearchParams(discoveryQuery)).map(([name,value])=><input key={name} type="hidden" name={name} value={value}/>)}
    </form>
  )
}
