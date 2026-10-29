import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { CatalogProductCard } from './catalog-product-card'
vi.mock('@/components/ui/liquid-lens',()=>({LiquidLens:()=>null}))
afterEach(cleanup)
it('mantém produto visível e bloqueia prévia enquanto a sessão não permite gerar link',()=>{
 const prepare=vi.fn(),product={id:'MLB2',title:'Produto disponível',productUrl:'https://produto.mercadolivre.com.br/MLB-2',priceCents:1990,oldPriceCents:null,imageUrl:null,checkedAt:'2026-10-28T12:00:00Z'}
 render(<CatalogProductCard product={product} busy={false} canGenerate={false} review prepare={prepare}/>)
 const button=screen.getByRole('button',{name:'Revisar e enviar'})
 expect(button.hasAttribute('disabled')).toBe(true);fireEvent.click(button);expect(prepare).not.toHaveBeenCalled()
 expect(screen.getByRole('heading',{name:product.title})).toBeTruthy()
})
it('produto descartado pelo operador exige restaurar antes de abrir prévia',()=>{
 const restore=vi.fn(),prepare=vi.fn(),product={id:'MLB1',title:'Produto descartado',productUrl:'https://produto.mercadolivre.com.br/MLB-1',priceCents:1990,oldPriceCents:null,imageUrl:null,checkedAt:'2026-10-28T12:00:00Z',decision:'DISCARDED' as const}
 render(<CatalogProductCard product={product} busy={false} canGenerate review prepare={prepare} restore={restore}/>)
 expect(screen.queryByRole('button',{name:'Ver oferta'})).toBeNull();expect(screen.queryByRole('button',{name:'Revisar e enviar'})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'Restaurar'}));expect(restore).toHaveBeenCalledWith(product);expect(prepare).not.toHaveBeenCalled()
 const link=screen.getByRole('link',{name:/Ver no Mercado Livre/})
 expect(link.getAttribute('href')).toBe(product.productUrl)
 expect(link.closest('details')).toBeNull()
 expect(link.getAttribute('rel')).toContain('noopener')
})
