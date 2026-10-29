import { describe,expect,it,vi } from 'vitest'
import { authenticated,bridgeAction,createBridgeLimiter,remoteProgram,validSshTarget,verifiedGeneratedAffiliate } from './local-vhg-bridge.mjs'

describe('ponte local VHG',()=>{
  it('enfileira consultas concorrentes em ordem sem aumentar os dois acessos remotos',async()=>{
    const acquire=createBridgeLimiter({activeLimit:2,queueLimit:2,waitMs:1000})
    const first=await acquire(),second=await acquire()
    const third=acquire(),fourth=acquire()
    expect(await acquire()).toBeNull()
    first?.();const releaseThird=await third
    let fourthReady=false;void fourth.then(()=>{fourthReady=true})
    first?.();await Promise.resolve()
    expect(fourthReady).toBe(false)
    second?.();const releaseFourth=await fourth
    expect(releaseThird).toBeTypeOf('function');expect(releaseFourth).toBeTypeOf('function')
    releaseThird?.();releaseFourth?.()
  })
  it('expira a espera limitada sem consumir uma vaga quando for liberada depois',async()=>{
    vi.useFakeTimers()
    try{
      const acquire=createBridgeLimiter({activeLimit:1,queueLimit:1,waitMs:10})
      const release=await acquire(),expired=acquire()
      await vi.advanceTimersByTimeAsync(10)
      expect(await expired).toBeNull()
      const waiting=acquire();release?.()
      const next=await waiting;expect(next).toBeTypeOf('function');next?.()
    }finally{vi.useRealTimers()}
  })

  it('batch stays bounded and read only, with all paths checked before remote execution',()=>{
    const paths=['/products/MLB123/items?limit=100','/products/MLB456/items?limit=100']
    expect(bridgeAction('POST','/catalog/batch',{paths})).toEqual({action:'catalogBatch',paths})
    for(const invalid of [[],Array(11).fill(paths[0]),[paths[0],'/oauth/token'],[paths[0],'/users/me'],[null]])expect(()=>bridgeAction('POST','/catalog/batch',{paths:invalid})).toThrow()
  })
  it('permite reputação somente por identificador numérico, sem outros recursos de usuário',()=>{
    expect(bridgeAction('POST','/catalog/request',{path:'/users/3764961247'})).toEqual({action:'catalog',path:'/users/3764961247'})
    for(const path of ['/users/me','/users/123/items','/users/123?attributes=address','/users/123456789012345678901'])expect(()=>bridgeAction('POST','/catalog/request',{path})).toThrow()
    expect(remoteProgram).toContain("path.startsWith('/users/')")
    expect(remoteProgram).toContain('seller_reputation:{level_id:')
  })

  const input={url:'https://www.mercadolivre.com.br/p/MLB123?wid=MLB456',tag:'own-tag',profile:'own-profile'}
  const row={origin_url:'https://produto.mercadolivre.com.br/MLB-456-_JM',tag:input.tag,type_url:'SOCIAL_PROFILE_ENCRYPTED',short_url:'https://meli.la/new',long_url:'https://www.mercadolivre.com.br/social/own-profile?matt_word=own-tag&matt_tool=123&ref=encrypted',created:true}
  const envelope={status:200,total_items:1,total_success:1,total_error:0,urls:[row]}
  const reference={sameSellerItem:(a:string,b:string)=>a.includes('456')&&b.includes('456'),generatedAffiliate:(value:{url:string;fullUrl:string})=>({url:value.url,fullUrl:value.fullUrl,tag:input.tag,profile:input.profile})}
  it('confirma o novo link pelo mapeamento origem/destino da resposta autenticada, sem reler a página pública',()=>{
    expect(verifiedGeneratedAffiliate(envelope,input,reference)).toEqual({url:row.short_url,fullUrl:row.long_url,tag:input.tag,profile:input.profile})
  })
  it('rejeita resposta ambígua, parcial, outro vendedor, outra identificação e URLs trocadas',()=>{
    for(const data of [null,{}, {...envelope,status:400},{...envelope,total_items:2},{...envelope,total_success:0},{...envelope,total_error:1},{...envelope,urls:[row,row]},...[{origin_url:'https://produto.mercadolivre.com.br/MLB-789-_JM'},{tag:'other'},{type_url:'SEARCH'},{short_url:'https://evil.test/link'},{long_url:row.long_url.replace('own-profile','other')},{long_url:row.long_url.replace('own-tag','other')},{long_url:row.long_url.replace('&ref=encrypted','')},{short_url:undefined}].map(change=>({...envelope,urls:[{...row,...change}]}))])expect(()=>verifiedGeneratedAffiliate(data,input,reference)).toThrow()
    expect(()=>verifiedGeneratedAffiliate(envelope,input,{...reference,generatedAffiliate:()=>({url:'https://meli.la/different',fullUrl:row.long_url,tag:input.tag,profile:input.profile})})).toThrow()
  })
  it('aceita timestamp do Coolify e rejeita argumentos de shell no destino SSH',()=>{
    expect(validSshTarget('root@89.167.16.44','panel-wwc2ajah3cpqnr09y39vme2j-20261026T181604')).toBe(true)
    expect(validSshTarget('root@89.167.16.44;reboot','panel-abc')).toBe(false)
    expect(validSshTarget('root@89.167.16.44','panel-abc;reboot')).toBe(false)
  })
  it('permite só consultas de catálogo e geração, nunca envios/grupos/autorização',()=>{
    expect(bridgeAction('GET','/catalog/status',null)).toEqual({action:'status'})
    expect(bridgeAction('POST','/catalog/request',{path:'/products/search?q=natal'})).toMatchObject({action:'catalog'})
    for(const path of ['/users/me','/oauth/token','/items/MLB123','/products/search?q=x#fragment','/products/search?q=x\r\n'])expect(()=>bridgeAction('POST','/catalog/request',{path})).toThrow()
    expect(()=>bridgeAction('POST','/message/sendText',{})).toThrow()
  })
  it('recusa URLs de outra origem, credenciais e autenticação incompleta',()=>{
    for(const url of ['http://meli.la/test','https://evil.test/a','https://user@meli.la/test','https://meli.la:8443/a'])expect(()=>bridgeAction('POST','/api/generate',{url})).toThrow()
    expect(bridgeAction('POST','/api/generate',{url:'https://produto.mercadolivre.com.br/MLB-123-_JM'})).toMatchObject({action:'generate'})
    expect(authenticated('Bearer private-fixture','private-fixture')).toBe(true)
    expect(authenticated(undefined,'private-fixture')).toBe(false)
    expect(authenticated('Bearer wrong','private-fixture')).toBe(false)
  })
  it('programa remoto é sintaticamente válido e abre SQLite somente leitura',()=>{
    expect(()=>new Function(remoteProgram.replace('__REFERENCE_BUNDLE__',''))).not.toThrow()
    expect(remoteProgram).toContain('readonly:true')
    expect(remoteProgram).not.toContain('grant_type')
  })
})
