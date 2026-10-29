import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { BroadcastHistory } from './broadcast-history'
vi.mock('@/lib/api',()=>({api:vi.fn()}))
vi.mock('@/components/ui/liquid-lens',()=>({LiquidLens:()=>null}))
afterEach(()=>{cleanup();vi.clearAllMocks()})
it('pagina cards sem acumular linhas e volta pelo cursor anterior',async()=>{
 vi.mocked(api).mockImplementation(async path=>({status:200,body:{broadcasts:[{id:path.includes('cursor=next')?'second':'first',offerId:'offer',createdAt:'2026-10-28T12:00:00Z',scheduledAt:'2026-10-28T12:00:00Z',message:'Mensagem',offer:{title:path.includes('cursor=next')?'Segundo produto':'Primeiro produto',priceCents:3990,imageUrl:null},counts:{pending:1,sending:0,sent:2,failed:0,uncertain:1}}],nextCursor:path.includes('cursor=next')?null:'next',totalCount:13}}))
 render(<BroadcastHistory segmentId="natal" busy={false} onCancel={vi.fn()}/>);await screen.findByText('Primeiro produto')
 expect(screen.getByText('4 grupos · 2 enviados · 1 em andamento')).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Próxima'}))
 await screen.findByText('Segundo produto');expect(screen.queryByText('Primeiro produto')).toBeNull();expect(screen.getByText('Página 2 · 13 envios')).toBeTruthy();expect(api).toHaveBeenCalledWith(expect.stringContaining('cursor=next'),expect.anything())
 fireEvent.click(screen.getByRole('button',{name:'Anterior'}));await screen.findByText('Primeiro produto');expect((screen.getByRole('button',{name:'Anterior'})as HTMLButtonElement).disabled).toBe(true)
})

it('reconsulta os mesmos cards quando atualização altera falhas sem criar novo envio',async()=>{
 let failed=0
 vi.mocked(api).mockImplementation(async()=>({status:200,body:{broadcasts:[{id:'batch',offerId:'offer',createdAt:'2026-10-28T12:00:00Z',scheduledAt:'2026-10-28T12:00:00Z',message:'Mensagem',counts:{pending:1-failed,sending:0,sent:0,failed,uncertain:0}}],nextCursor:null,totalCount:1}}))
 const view=render(<BroadcastHistory busy={false} revision={1} onCancel={vi.fn()}/>);await screen.findByText('1 grupos · 0 enviados · 1 em andamento')
 failed=1;view.rerender(<BroadcastHistory busy={false} revision={2} onCancel={vi.fn()}/>);await screen.findByText('0 precisam de conferência · 1 falhas')
 expect(api).toHaveBeenCalledTimes(2)
})

it('legado sem preço imutável não mostra preço zero nem imagem atual do rascunho',async()=>{
 vi.mocked(api).mockResolvedValue({status:200,body:{broadcasts:[{id:'legacy',offerId:'offer',createdAt:'2026-10-28T12:00:00Z',scheduledAt:'2026-10-28T12:00:00Z',message:'Título original\nR$ 19,90',imageUrl:null,snapshotAvailable:false,offer:{id:'offer',title:'Título original',priceCents:null,oldPriceCents:null,imageUrl:'https://http2.mlstatic.com/changed.jpg',affiliateUrl:null},counts:{pending:0,sending:0,sent:1,failed:0,uncertain:0}}],nextCursor:null,totalCount:1}})
 render(<BroadcastHistory busy={false} onCancel={vi.fn()}/>);await screen.findByText('Título original')
 expect(screen.getByText('Confira o preço na mensagem enviada')).toBeTruthy();expect(screen.queryByText('R$ 0,00')).toBeNull();expect(screen.queryByRole('img')).toBeNull()
})
