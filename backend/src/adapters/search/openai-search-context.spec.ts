import {describe,expect,it,vi} from 'vitest'
import {OpenAiSearchContext} from './openai-search-context'

const input={tenantId:'tenant-a',query:'quero garimpar precinhos nos grupos do zap',niches:[{slug:'compras',name:'Compras e descontos'}],networks:[{slug:'whatsapp',name:'WhatsApp'}]}
const context={query:'ofertas descontos compras',niches:['compras'],networks:['whatsapp'],mode:'facet'}
const result=(value:unknown)=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(value)}}]}),{status:200})

describe('interpretação contextual OpenAI',()=>{
 it('interpreta linguagem livre usando a taxonomia recebida e não uma tabela de exemplos',async()=>{
  const fetcher=vi.fn<typeof fetch>().mockResolvedValue(result(context))
  const service=new OpenAiSearchContext('test-key',fetcher)
  expect(await service.interpret(input)).toEqual(context)
  const body=JSON.parse(String(fetcher.mock.calls[0][1]?.body))
  expect(body.store).toBe(false)
  expect(JSON.parse(body.messages[1].content)).toEqual({query:input.query,niches:input.niches,networks:input.networks})
  expect(body.response_format.json_schema.strict).toBe(true)
  expect(body.response_format.json_schema.schema.properties.niches.items.enum).toEqual(['compras'])
 })
 it('reutiliza consultas simultâneas, mas isola tenant e mudança de taxonomia',async()=>{
  const fetcher=vi.fn<typeof fetch>().mockImplementation(async()=>result(context))
  const service=new OpenAiSearchContext('test-key',fetcher)
  await Promise.all([service.interpret(input),service.interpret(input)])
  expect(fetcher).toHaveBeenCalledTimes(1)
  await service.interpret({...input,tenantId:'tenant-b'})
  await service.interpret({...input,niches:[...input.niches,{slug:'novo',name:'Novo tema'}]})
  expect(fetcher).toHaveBeenCalledTimes(3)
 })
 it.each([
  {...context,niches:['privado']},
  {...context,networks:['inventada']},
  {...context,query:'x'.repeat(241)},
  {...context,extra:'instruções'},
 ])('recusa saída fora do contrato ou da taxonomia',async output=>{
  const service=new OpenAiSearchContext('test-key',vi.fn<typeof fetch>().mockResolvedValue(result(output)))
  await expect(service.interpret(input)).rejects.toThrow()
 })
 it('não memoriza falhas e permite tentar novamente',async()=>{
  const fetcher=vi.fn<typeof fetch>().mockResolvedValueOnce(new Response('',{status:503})).mockResolvedValueOnce(result(context))
  const service=new OpenAiSearchContext('test-key',fetcher)
  await expect(service.interpret(input)).rejects.toThrow()
  expect(await service.interpret(input)).toEqual(context)
  expect(fetcher).toHaveBeenCalledTimes(2)
 })
 it('não envia requisição sem chave ou com consulta longa',async()=>{
  const fetcher=vi.fn<typeof fetch>()
  await expect(new OpenAiSearchContext('',fetcher).interpret(input)).rejects.toThrow()
  await expect(new OpenAiSearchContext('test-key',fetcher).interpret({...input,query:'x'.repeat(301)})).rejects.toThrow()
  expect(fetcher).not.toHaveBeenCalled()
 })
 it('expira a interpretação para não manter sugestões antigas indefinidamente',async()=>{
  const now=vi.spyOn(Date,'now').mockReturnValue(1_000)
  try{
   const fetcher=vi.fn<typeof fetch>().mockImplementation(async()=>result(context))
   const service=new OpenAiSearchContext('test-key',fetcher)
   await service.interpret(input)
   now.mockReturnValue(302_000)
   await service.interpret(input)
   expect(fetcher).toHaveBeenCalledTimes(2)
  }finally{now.mockRestore()}
 })
 it('limita bytes da resposta externa mesmo sem content-length',async()=>{
  const fetcher=vi.fn<typeof fetch>().mockResolvedValue(new Response('x'.repeat(16_385)))
  await expect(new OpenAiSearchContext('test-key',fetcher).interpret(input)).rejects.toThrow('excede o limite')
 })
})
