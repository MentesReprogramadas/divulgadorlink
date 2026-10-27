import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PublicCollectionsSection } from './public-collections'
import { loadCatalog } from '@/lib/catalog-page'

vi.mock('@/lib/catalog-page',()=>({loadCatalog:vi.fn()}))
afterEach(()=>{cleanup();vi.clearAllMocks()})

describe('coleções editoriais renderizadas no servidor',()=>{
  it('filtra pela rede e prioriza adulto, apostas e ofertas sem duplicar +18',async()=>{
    const item={description:'Apresentação pública.',explicit:false,networkSlug:'telegram'}
    vi.mocked(loadCatalog).mockResolvedValue({status:200,body:{collections:[
      {...item,slug:'whatsapp',title:'Ofertas WhatsApp',networkSlug:'whatsapp'},
      {...item,slug:'ofertas',title:'Ofertas Telegram',nicheSlug:'compras-ofertas-cupons'},
      {...item,slug:'apostas',title:'Apostas Telegram',nicheSlug:'apostas'},
      {...item,slug:'adulto',title:'Telegram adulto +18',nicheSlug:'adulto',explicit:true},
    ]}})
    render(await PublicCollectionsSection({networkSlug:'telegram'}))
    expect(screen.getAllByRole('link').map(link=>link.textContent)).toEqual(['Telegram adulto +18','Apostas Telegram','Ofertas Telegram'])
    expect(screen.queryByRole('link',{name:'Ofertas WhatsApp'})).toBeNull()
  })
  it('omite a seção quando só há coleções de outra rede',async()=>{
    vi.mocked(loadCatalog).mockResolvedValue({status:200,body:{collections:[{slug:'site',title:'Sites',description:'Sites de apostas.',explicit:false,networkSlug:'site'}]}})
    expect(await PublicCollectionsSection({networkSlug:'telegram'})).toBeNull()
  })
  it('permite uma seleção contextual de sites de apostas sem misturar outras categorias',async()=>{
    const item={description:'Apresentação pública.',explicit:false,networkSlug:'site'}
    vi.mocked(loadCatalog).mockResolvedValue({status:200,body:{collections:[
      {...item,slug:'apostas',title:'Sites de apostas',nicheSlug:'apostas'},
      {...item,slug:'ferramentas',title:'Ferramentas',nicheSlug:'servicos-ferramentas'},
    ]}})
    render(await PublicCollectionsSection({networkSlug:'site',nicheSlug:'apostas',heading:'Sites de apostas no catálogo'}))
    expect(screen.getByRole('region',{name:'Sites de apostas no catálogo'})).toBeTruthy()
    expect(screen.getAllByRole('link').map(link=>link.textContent)).toEqual(['Sites de apostas'])
  })
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
