import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { CatalogSeoEditor, LinkSeoEditor } from './catalog-seo-editor'

const api = vi.fn()
vi.mock('@/lib/api',()=>({api:(...args:unknown[])=>api(...args)}))
afterEach(()=>{cleanup();api.mockReset()})
const editorial={version:3,facets:{},links:{},collections:[]}
const facets={niches:[{slug:'adulto',name:'Adulto'}],networks:[{slug:'telegram',name:'Telegram'}]}

describe('edição SEO administrativa',()=>{
  it('carrega os IDs da coleção e omite a curadoria quando o campo é limpo',async()=>{
    const user=userEvent.setup()
    const collection={slug:'ofertas',title:'Ofertas selecionadas',description:'Seleção editorial.',networkSlug:'telegram',nicheSlug:null,approved:false,explicit:false,linkIds:['one','two']}
    api.mockImplementation((path:string)=>Promise.resolve({status:200,body:path.endsWith('facets')?facets:{...editorial,collections:[collection]}}))
    render(<CatalogSeoEditor />)
    await user.click(await screen.findByRole('combobox',{name:'Página editorial'}))
    await user.click(await screen.findByRole('option',{name:'Coleção: Ofertas selecionadas'}))
    const selected=screen.getByRole('textbox',{name:'Links selecionados (opcional)'}) as HTMLTextAreaElement
    expect(selected.value).toBe('one\ntwo')
    fireEvent.change(selected,{target:{value:'  \n '}})
    api.mockResolvedValueOnce({status:200,body:editorial})
    fireEvent.click(screen.getByRole('button',{name:'Salvar SEO'}))
    await waitFor(()=>expect(api.mock.calls.at(-1)![1]?.method).toBe('PUT'))
    expect(JSON.parse(api.mock.calls.at(-1)![1].body).collections[0]).not.toHaveProperty('linkIds')
  })
  it('salva coleção com revisão e conserva dados quando a revisão está em conflito',async()=>{
    const user=userEvent.setup()
    api.mockImplementation((path:string)=>Promise.resolve({status:200,body:path.endsWith('facets')?facets:editorial}))
    render(<CatalogSeoEditor />)
    fireEvent.click(await screen.findByRole('button',{name:'Nova coleção'}))
    fireEvent.change(screen.getByRole('textbox',{name:'Endereço da coleção'}),{target:{value:'telegram-adulto'}})
    fireEvent.change(screen.getByRole('textbox',{name:'Título público'}),{target:{value:'Comunidades adultas no Telegram'}})
    fireEvent.change(screen.getByRole('textbox',{name:'Descrição pública'}),{target:{value:'Prévia editorial autorizada.'}})
    fireEvent.change(screen.getByRole('textbox',{name:'Links selecionados (opcional)'}),{target:{value:'link-one\nlink-two\nlink-one'}})
    await user.click(screen.getByRole('combobox',{name:'Rede da coleção'}))
    await user.click(await screen.findByRole('option',{name:'Telegram'}))
    api.mockResolvedValueOnce({status:409,body:{message:'O conteúdo mudou. Atualize antes de salvar.'}})
    fireEvent.click(screen.getByRole('button',{name:'Salvar SEO'}))
    expect((await screen.findByRole('alert')).textContent).toContain('O conteúdo mudou.')
    expect((screen.getByRole('textbox',{name:'Título público'}) as HTMLInputElement).value).toBe('Comunidades adultas no Telegram')
    const body=JSON.parse(api.mock.calls.at(-1)![1].body)
    expect(body.expectedVersion).toBe(3)
    expect(body.collections[0]).toMatchObject({slug:'telegram-adulto',networkSlug:'telegram',approved:false,linkIds:['link-one','link-two']})
  })
  it('revisa a prévia individual sem enviar fingerprint vindo do cliente',async()=>{
    api.mockResolvedValueOnce({status:200,body:{version:3,preview:null,name:'Anúncio publicado',description:'Descrição original',requiresAge:true}})
    render(<LinkSeoEditor linkId="one" />)
    const title=await screen.findByRole('textbox',{name:'Título da prévia'})
    fireEvent.change(title,{target:{value:'Título seguro'}})
    fireEvent.change(screen.getByRole('textbox',{name:'Resumo da prévia'}),{target:{value:'Prévia editorial autorizada.'}})
    api.mockResolvedValueOnce({status:200,body:editorial})
    fireEvent.click(screen.getByRole('button',{name:'Salvar prévia'}))
    await waitFor(()=>expect(api).toHaveBeenCalledTimes(2))
    expect(JSON.parse(api.mock.calls[1][1].body)).toEqual({expectedVersion:3,title:'Título seguro',description:'Prévia editorial autorizada.',explicit:false,approved:false})
  })
})
