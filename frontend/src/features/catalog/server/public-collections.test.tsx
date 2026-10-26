import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PublicCollectionsSection } from './public-collections'
import { loadCatalog } from '@/lib/catalog-page'

vi.mock('@/lib/catalog-page',()=>({loadCatalog:vi.fn()}))
afterEach(()=>{cleanup();vi.clearAllMocks()})

describe('coleções editoriais renderizadas no servidor',()=>{
  it('entrega links de coleções aprovadas e identifica a classificação pública',async()=>{
    vi.mocked(loadCatalog).mockResolvedValue({status:200,body:{collections:[{slug:'telegram-adulto',title:'Comunidades adultas no Telegram',description:'Apresentações públicas aprovadas.',explicit:true}]}})
    render(await PublicCollectionsSection())
    expect(screen.getByRole('link',{name:'Comunidades adultas no Telegram · +18'}).getAttribute('href')).toBe('/descobrir/telegram-adulto')
    expect(screen.getByText('Apresentações públicas aprovadas.')).toBeTruthy()
  })
  it('não cria uma seção vazia sem coleções elegíveis',async()=>{
    vi.mocked(loadCatalog).mockResolvedValue({status:200,body:{collections:[]}})
    expect(await PublicCollectionsSection()).toBeNull()
  })
  it('informa falha de carregamento sem interromper o catálogo',async()=>{
    vi.mocked(loadCatalog).mockRejectedValue(new Error('upstream unavailable'))
    render(await PublicCollectionsSection())
    expect(screen.getByRole('status').textContent).toContain('Não foi possível carregar as coleções')
  })
  it('trata contrato incompleto como falha de carregamento, não lista vazia',async()=>{
    vi.mocked(loadCatalog).mockResolvedValue({status:200,body:{}})
    render(await PublicCollectionsSection())
    expect(screen.getByRole('status').textContent).toContain('Não foi possível carregar as coleções')
  })
})
