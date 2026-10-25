import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { FavoriteList } from './favorite-list'
afterEach(cleanup)
it('shows optional approved media on saved links and keeps the full destination',()=>{
 render(<FavoriteList items={[{id:'f',linkId:'l',available:true,name:'Comunidade',description:'Conversas',href:'/link/l',imageUrl:'/api/v1/links/l/media/approved',imageAlt:'Pessoas reunidas',iconUrl:'/api/v1/links/l/media/icon'}]} actions={()=><button>Remover favorito</button>}/> )
 expect(screen.getByRole('img',{name:'Pessoas reunidas'}).getAttribute('src')).toBe('/bff/v1/links/l/media/approved')
 expect(screen.getByRole('link',{name:'Comunidade'}).getAttribute('href')).toBe('/link/l')
})
it('F04-C02/T04 unavailable favorite has explanation without a clickable destination or hidden metadata', () => {
  const hidden = { id: 'f', linkId: 'l', available: false as const, name: 'SentinelaOculta', href: 'https://private.example' }
  render(<FavoriteList items={[hidden]} actions={() => <button>Remover favorito</button>} />)
  expect(screen.getByRole('heading', { name: 'Link indisponível' })).toBeTruthy()
  expect(screen.queryByRole('link')).toBeNull(); expect(document.body.innerHTML).not.toContain('SentinelaOculta'); expect(document.body.innerHTML).not.toContain('private.example')
})
