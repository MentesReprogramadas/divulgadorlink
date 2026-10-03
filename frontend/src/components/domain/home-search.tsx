'use client'

import { SearchBox } from '@/components/domain/search-box'

export function HomeSearch() {
  return (
    <form className="home-search" action="/busca">
      <SearchBox id="home-search" label="Busca" />
    </form>
  )
}
