'use client'

import { SearchBox } from '@/components/domain/search-box'

export function HomeSearch({discoveryQuery=''}:{discoveryQuery?:string}) {
  return (
    <form className="home-search" action="/busca">
      <SearchBox id="home-search" label="Busca" discoveryQuery={discoveryQuery}/>
      {Array.from(new URLSearchParams(discoveryQuery)).map(([name,value])=><input key={name} type="hidden" name={name} value={value}/>)}
    </form>
  )
}
