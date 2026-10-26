import { describe, expect, it, vi } from 'vitest'
import { generateHomeMetadata } from './home-page'
import { generateMetadata as collectionMetadata } from '@/app/descobrir/[slug]/page'
import { loadCatalog } from '@/lib/catalog-page'

vi.mock('@/lib/catalog-page', () => ({loadCatalog:vi.fn()}))
vi.mock('next/navigation', () => ({notFound:()=>{throw Error('not-found')}}))

const seo = {title:'Comunidades por interesse',description:'Descrição pública',canonical:'https://temlinkaqui.com/?cursor=two',robots:'index,follow'}

describe('metadata das páginas navegáveis', () => {
  it('carrega a própria página da home para metadata e mantém canonical da sequência', async () => {
    vi.mocked(loadCatalog).mockResolvedValue({status:200,body:{seo}})
    const metadata = await generateHomeMetadata({searchParams:Promise.resolve({cursor:'two'})})
    expect(loadCatalog).toHaveBeenLastCalledWith('/api/v1/home?cursor=two')
    expect(metadata.alternates).toEqual({canonical:seo.canonical})
  })
  it('não indexa filtros arbitrários nem falha ao receber filtro inválido', async () => {
    vi.mocked(loadCatalog).mockResolvedValue({status:200,body:{seo}})
    expect((await generateHomeMetadata({searchParams:Promise.resolve({languageTag:'pt'})})).robots).toEqual({index:false,follow:true})
    vi.mocked(loadCatalog).mockResolvedValue({status:400,body:null})
    expect((await generateHomeMetadata({searchParams:Promise.resolve({cityId:'invalid'})})).robots).toEqual({index:false,follow:true})
  })
  it('coleção usa canonical e classificação pública definidos pelo backend', async () => {
    vi.mocked(loadCatalog).mockResolvedValue({status:200,body:{seo:{...seo,canonical:'https://temlinkaqui.com/descobrir/comunidades-adultas',rating:'adult'}}})
    const metadata = await collectionMetadata({params:Promise.resolve({slug:'comunidades-adultas'}),searchParams:Promise.resolve({cursor:'two'})})
    expect(loadCatalog).toHaveBeenLastCalledWith('/api/v1/catalog-collections/comunidades-adultas?cursor=two')
    expect(metadata.other).toEqual({rating:'adult'})
  })
})
