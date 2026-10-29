import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { ProductPreviewDialog } from './product-preview-dialog'
import type { ProductPreview } from './contracts'
vi.mock('@/lib/api', () => ({api:vi.fn()}))
vi.mock('@/components/ui/liquid-lens', () => ({LiquidLens:() => null}))
afterEach(() => {cleanup();vi.clearAllMocks()})
const product = {id:'MLB123',title:'Título original',productUrl:'https://produto.mercadolivre.com.br/MLB-123',priceCents:3990,oldPriceCents:null,imageUrl:'https://http2.mlstatic.com/image.jpg',checkedAt:'2026-10-28T12:00:00Z'}
const preview: ProductPreview = {previewToken:'server-signed',expiresAt:'2099-10-28T12:00:00Z',product,title:'Produto objetivo',headline:'Um produto para sua rotina ✨',message:'Um produto para sua rotina ✨\nProduto objetivo\nR$ 39,90\nhttps://meli.la/oferta',affiliateUrl:'https://meli.la/oferta',destinations:{segmentId:'natal',name:'Natal',groups:[{id:'g1',name:'Natal #1'}],count:1},titleSource:'OPENAI',priceChanged:false}
const props = {segmentId:'natal',product,onClose:vi.fn(),onChanged:vi.fn(),returnFocusTo:null}
it('mostra prévia exata sem aprovar e cancelar não envia',async()=>{
 let resolve!:(value:Awaited<ReturnType<typeof api>>)=>void
 vi.mocked(api).mockImplementation(() => new Promise(done=>{resolve=done}))
 render(<ProductPreviewDialog {...props}/>);expect(screen.getByText('Conferindo preço, foto, link e destinos…')).toBeTruthy()
 await act(async()=>{resolve({status:200,body:preview})})
 expect(screen.getByLabelText('Mensagem exata para o WhatsApp').querySelector('pre')?.textContent).toBe(preview.message)
 expect(screen.getByRole('img',{name:preview.title}).getAttribute('src')).toBe(product.imageUrl)
 expect(screen.getByText('Preço anterior não informado')).toBeTruthy();expect(screen.getByText('Natal #1')).toBeTruthy()
 expect(screen.getByText('Título criado com IA')).toBeTruthy();expect(screen.queryByRole('heading',{name:product.title})).toBeNull()
 expect(api).toHaveBeenCalledTimes(1);fireEvent.click(screen.getByRole('button',{name:'Cancelar'}));expect(props.onClose).toHaveBeenCalledOnce();expect(api).toHaveBeenCalledTimes(1)
})
it('regenera título e mensagem juntos e envia apenas a nova assinatura',async()=>{
 const regenerated={previewToken:'new-signature',title:'Novo título criado com IA',headline:'Um presente para quem você ama 🎁',titleSource:'OPENAI',message:'Um presente para quem você ama 🎁\nNovo título criado com IA\nR$ 39,90\nhttps://meli.la/oferta',expiresAt:preview.expiresAt}
 let finish!:(value:Awaited<ReturnType<typeof api>>)=>void
 vi.mocked(api).mockImplementation(async path=>path.endsWith('/preview')?{status:200,body:preview}:path.endsWith('/preview/title')?new Promise(resolve=>{finish=resolve}):path.endsWith('/send')?{status:200,body:{broadcastId:'batch'}}:{status:200,body:{counts:{pending:0,sending:0,sent:1,failed:0,uncertain:0}}})
 render(<ProductPreviewDialog {...props}/>);await screen.findByText('Natal #1')
 const refresh=screen.getByRole('button',{name:'Gerar outro título'});refresh.focus();expect(document.activeElement).toBe(refresh)
 fireEvent.click(refresh);fireEvent.click(refresh)
 expect(vi.mocked(api).mock.calls.filter(([path])=>path.endsWith('/preview/title'))).toHaveLength(1)
 expect(api).toHaveBeenCalledWith('/v1/admin/affiliates/segments/natal/products/preview/title',expect.objectContaining({method:'POST',body:JSON.stringify({previewToken:preview.previewToken})}))
 expect(screen.getByRole('button',{name:'Enviar'}).hasAttribute('disabled')).toBe(true)
 expect(screen.getByRole('button',{name:'Descartar'}).hasAttribute('disabled')).toBe(true)
 expect(screen.getByRole('button',{name:'Cancelar'}).hasAttribute('disabled')).toBe(false)
 expect(screen.getByText('Gerando outro título…')).toBeTruthy()
 expect(screen.getByLabelText('Mensagem exata para o WhatsApp').querySelector('pre')?.textContent).toBe(preview.message)
 await act(async()=>{finish({status:200,body:regenerated})})
 expect(screen.getByRole('heading',{name:regenerated.title})).toBeTruthy()
 expect(screen.getByLabelText('Mensagem exata para o WhatsApp').querySelector('pre')?.textContent).toBe(regenerated.message)
 expect(screen.getByRole('link').getAttribute('href')).toBe(preview.affiliateUrl)
 expect(screen.getByRole('img').getAttribute('src')).toBe(product.imageUrl)
 fireEvent.click(screen.getByRole('button',{name:'Enviar'}))
 await waitFor(()=>expect(api).toHaveBeenCalledWith('/v1/admin/affiliates/segments/natal/products/send',expect.objectContaining({body:JSON.stringify({previewToken:regenerated.previewToken,confirm:true})})))
})
it('falha de IA mantém título, mensagem e assinatura anteriores',async()=>{
 vi.mocked(api).mockImplementation(async path=>path.endsWith('/preview')?{status:200,body:{...preview,title:product.title,titleSource:'ORIGINAL'}}:path.endsWith('/preview/title')?{status:503,body:{message:'IA indisponível.'}}:path.endsWith('/send')?{status:200,body:{broadcastId:'batch'}}:{status:200,body:{counts:{pending:0,sending:0,sent:1,failed:0,uncertain:0}}})
 render(<ProductPreviewDialog {...props}/>);await screen.findByText('Título original',{selector:'p'})
 fireEvent.click(screen.getByRole('button',{name:'Gerar outro título'}))
 expect(await screen.findByRole('alert')).toHaveProperty('textContent','IA indisponível. O título e a mensagem anteriores foram mantidos. Tente gerar outro título novamente.')
 expect(screen.getByRole('heading',{name:product.title})).toBeTruthy()
 expect(screen.getByLabelText('Mensagem exata para o WhatsApp').querySelector('pre')?.textContent).toBe(preview.message)
 expect(screen.getByRole('button',{name:'Gerar outro título'}).hasAttribute('disabled')).toBe(false)
 fireEvent.click(screen.getByRole('button',{name:'Enviar'}))
 await waitFor(()=>expect(api).toHaveBeenCalledWith('/v1/admin/affiliates/segments/natal/products/send',expect.objectContaining({body:JSON.stringify({previewToken:preview.previewToken,confirm:true})})))
})
it('Escape cancela regeneração e ignora resposta após troca de produto',async()=>{
 let finish!:(value:Awaited<ReturnType<typeof api>>)=>void
 vi.mocked(api).mockImplementation(async path=>path.endsWith('/preview')?{status:200,body:preview}:new Promise(resolve=>{finish=resolve}))
 const view=render(<ProductPreviewDialog {...props}/>);await screen.findByText('Natal #1')
 fireEvent.click(screen.getByRole('button',{name:'Gerar outro título'}))
 const signal=vi.mocked(api).mock.calls.at(-1)?.[1]?.signal
 fireEvent(screen.getByRole('dialog'),new Event('cancel',{bubbles:true,cancelable:true}))
 expect(props.onClose).toHaveBeenCalledOnce();expect(signal?.aborted).toBe(true)
 view.rerender(<ProductPreviewDialog {...props} product={{...product,id:'MLB456'}} />)
 await act(async()=>{finish({status:200,body:{previewToken:'stale',title:'Título obsoleto',titleSource:'OPENAI',message:'obsoleto',expiresAt:preview.expiresAt}})})
 expect(screen.queryByText('Título obsoleto')).toBeNull()
 expect(screen.getByRole('heading',{name:preview.title})).toBeTruthy()
 expect(screen.getByRole('button',{name:'Enviar'}).hasAttribute('disabled')).toBe(false)
})
it('desmontagem aborta regeneração pendente',async()=>{
 vi.mocked(api).mockImplementation(async path=>path.endsWith('/preview')?{status:200,body:preview}:new Promise(()=>{}))
 const view=render(<ProductPreviewDialog {...props}/>);await screen.findByText('Natal #1')
 fireEvent.click(screen.getByRole('button',{name:'Gerar outro título'}))
 const signal=vi.mocked(api).mock.calls.at(-1)?.[1]?.signal;view.unmount();expect(signal?.aborted).toBe(true)
})
it('duplo clique envia uma vez e acompanha resposta incerta sem repetir',async()=>{
 let finish!:(value:Awaited<ReturnType<typeof api>>)=>void
 vi.mocked(api).mockImplementation(async path=>path.endsWith('/preview')?{status:200,body:preview}:path.endsWith('/send')?new Promise(resolve=>{finish=resolve}):{status:200,body:{counts:{pending:0,sending:0,sent:0,failed:0,uncertain:1}}})
 render(<ProductPreviewDialog {...props}/>);await screen.findByText('Natal #1');const send=screen.getByRole('button',{name:'Enviar'})
 fireEvent.click(send);fireEvent.click(send)
 expect(vi.mocked(api).mock.calls.filter(([path])=>path.endsWith('/send'))).toHaveLength(1)
 expect(api).toHaveBeenCalledWith('/v1/admin/affiliates/segments/natal/products/send',expect.objectContaining({method:'POST',body:JSON.stringify({previewToken:'server-signed',confirm:true})}))
 await act(async()=>{finish({status:200,body:{broadcastId:'batch'}})})
 await screen.findByText(/Nenhuma nova tentativa será feita automaticamente/)
 expect(screen.queryByRole('button',{name:'Enviar'})).toBeNull();expect(props.onChanged).toHaveBeenCalledOnce()
})
it('mostra erro do servidor sem sucesso falso',async()=>{
 vi.mocked(api).mockImplementation(async path=>path.endsWith('/preview')?{status:200,body:preview}:{status:409,body:{message:'O preço mudou. Abra a prévia novamente.'}})
 render(<ProductPreviewDialog {...props}/>);await screen.findByText('Natal #1');fireEvent.click(screen.getByRole('button',{name:'Enviar'}))
 expect(await screen.findByRole('alert')).toHaveProperty('textContent','O preço mudou. Abra a prévia novamente.');expect(props.onChanged).not.toHaveBeenCalled()
})
it('aborta prévia na saída e ignora resposta antiga',async()=>{
 let finish!:(value:Awaited<ReturnType<typeof api>>)=>void
 vi.mocked(api).mockImplementation(()=>new Promise(resolve=>{finish=resolve}))
 const view=render(<ProductPreviewDialog {...props}/>);const signal=vi.mocked(api).mock.calls[0][1]?.signal;view.unmount()
 expect(signal?.aborted).toBe(true);await act(async()=>{finish({status:200,body:preview})});expect(props.onChanged).not.toHaveBeenCalled()
})
it('descarta sem enviar após persistir',async()=>{
 vi.mocked(api).mockImplementation(async path=>({status:200,body:path.endsWith('/preview')?preview:{}}))
 render(<ProductPreviewDialog {...props}/>);await screen.findByText('Natal #1');fireEvent.click(screen.getByRole('button',{name:'Descartar'}))
 await waitFor(()=>expect(props.onChanged).toHaveBeenCalledOnce());expect(props.onClose).toHaveBeenCalledOnce()
 expect(api).toHaveBeenCalledWith('/v1/admin/affiliates/segments/natal/products/discard',expect.objectContaining({body:JSON.stringify({itemId:'MLB123'})}));expect(vi.mocked(api).mock.calls.some(([path])=>path.endsWith('/send'))).toBe(false)
})
