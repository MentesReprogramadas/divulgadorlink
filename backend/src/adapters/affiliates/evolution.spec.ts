import { describe, expect, it, vi } from 'vitest'
import { AffiliateEvolution } from './evolution'

describe('Evolution de afiliados', () => {
  const config = { baseUrl:'https://evolution.example', apiKey:'private-key', instance:'Natal 01' }
  it('valida o grupo retornado, sem confiar apenas em connectionState', async () => {
    const transport = vi.fn().mockResolvedValue(new Response(JSON.stringify({id:'999@g.us',subject:'Outro',size:3})))
    await expect(new AffiliateEvolution(config, transport).group('123@g.us')).rejects.toThrow()
  })
  it('não trata contagem desconhecida como grupo vazio', async () => {
    const transport = vi.fn().mockResolvedValue(new Response(JSON.stringify({id:'123@g.us',subject:'Natal'})))
    await expect(new AffiliateEvolution(config, transport).group('123@g.us')).rejects.toThrow()
  })
  it('timeout de envio é incerto; não repete automaticamente', async () => {
    const transport = vi.fn().mockRejectedValue(new Error('timeout private-key'))
    await expect(new AffiliateEvolution(config, transport).send('123@g.us','Oferta',null)).rejects.toMatchObject({uncertain:true})
    expect(transport).toHaveBeenCalledTimes(1)
  })
  it('resposta sem ID não confirma envio', async () => {
    const transport = vi.fn().mockResolvedValue(new Response('{}'))
    await expect(new AffiliateEvolution(config, transport).send('123@g.us','Oferta',null)).rejects.toMatchObject({uncertain:true})
  })
  it('aceita a resposta direta de createGroup v2.3.7 e adiciona o participante inicial', async () => {
    const transport = vi.fn().mockResolvedValue(Response.json({id:'123@g.us',subject:'Natal #2',participants:[{id:'5511999999999@s.whatsapp.net'}]}))
    expect(await new AffiliateEvolution({...config,ownerPhone:'5511999999999'},transport).create('Natal #2','Descrição')).toBe('123@g.us')
    expect(transport).toHaveBeenCalledWith(new URL('https://evolution.example/group/create/Natal%2001'),expect.objectContaining({body:JSON.stringify({subject:'Natal #2',description:'Descrição',participants:['5511999999999']})}))
  })
  it('não tenta criar grupo sem participante e trata resposta de criação sem ID como incerta', async () => {
    const transport = vi.fn().mockResolvedValue(Response.json({group:{id:'123@g.us'}}))
    await expect(new AffiliateEvolution(config,transport).create('Natal #2','')).rejects.toMatchObject({status:409})
    expect(transport).not.toHaveBeenCalled()
    await expect(new AffiliateEvolution({...config,ownerPhone:'5511999999999'},transport).create('Natal #2','')).rejects.toMatchObject({uncertain:true})
  })
  it('aceita pairingCode nulo do QR real e estado aberto sem QR', async () => {
    const transport = vi.fn().mockResolvedValueOnce(Response.json({pairingCode:null,code:'qr-content',base64:'data:image/png;base64,iVBORw0KGgo=',count:1})).mockResolvedValueOnce(Response.json({instance:{instanceName:'Natal 01',state:'open'}}))
    const client = new AffiliateEvolution(config,transport)
    expect(await client.connect()).toMatchObject({code:'qr-content',base64:'data:image/png;base64,iVBORw0KGgo='})
    expect(await client.connect()).toMatchObject({state:'open'})
  })
  it('não aceita HTTP200 error como QR disponível', async () => {
    const transport = vi.fn().mockResolvedValue(Response.json({error:true,message:'private-key upstream'}))
    await expect(new AffiliateEvolution(config,transport).connect()).rejects.toMatchObject({uncertain:false})
  })
  it('valida identidade e origem da foto e distingue foto ausente de envelope inválido', async () => {
    const transport = vi.fn().mockResolvedValueOnce(Response.json({wuid:'123@g.us',profilePictureUrl:'https://pps.whatsapp.net/photo.jpg'})).mockResolvedValueOnce(Response.json({wuid:'123@g.us',profilePictureUrl:null})).mockResolvedValueOnce(Response.json({wuid:'999@g.us',profilePictureUrl:'https://pps.whatsapp.net/photo.jpg'})).mockResolvedValueOnce(Response.json({wuid:'123@g.us',profilePictureUrl:'https://127.0.0.1/internal'})).mockResolvedValueOnce(Response.json({}))
    const client = new AffiliateEvolution(config,transport)
    expect(await client.avatar('123@g.us')).toBe('https://pps.whatsapp.net/photo.jpg')
    expect(await client.avatar('123@g.us')).toBeNull()
    for(let attempt=0;attempt<3;attempt++)await expect(client.avatar('123@g.us')).rejects.toMatchObject({uncertain:false})
    expect(transport).toHaveBeenCalledWith(new URL('https://evolution.example/chat/fetchProfilePictureUrl/Natal%2001'),expect.objectContaining({body:JSON.stringify({number:'123@g.us'})}))
  })
  it('interrompe o stream assim que excede 2 MB, antes de alocar todo o corpo', async () => {
    let chunks = 0
    const cancel = vi.fn(), chunk = new Uint8Array(800_000), pull = vi.fn((controller:ReadableStreamDefaultController<Uint8Array>)=>{if(chunks++ < 10)controller.enqueue(chunk);else controller.close()})
    const transport = vi.fn().mockResolvedValue(new Response(new ReadableStream({pull,cancel})))
    await expect(new AffiliateEvolution(config,transport).send('123@g.us','Oferta',null)).rejects.toMatchObject({uncertain:true})
    expect(cancel).toHaveBeenCalledOnce()
    expect(pull.mock.calls.length).toBeLessThan(6)
  })
  it('mantém 400/408/500 incertos após envio e identifica rejeições anteriores ao envio', async () => {
    for(const status of [400,408,500,502]){
      const transport=vi.fn().mockResolvedValue(new Response('provider private-key',{status}))
      await expect(new AffiliateEvolution(config,transport).send('123@g.us','Oferta',null)).rejects.toMatchObject({uncertain:true,providerStatus:status})
    }
    for(const status of [401,403,404,405,409,413,415,422,429]){
      const transport=vi.fn().mockResolvedValue(new Response('provider private-key',{status}))
      await expect(new AffiliateEvolution(config,transport).send('123@g.us','Oferta',null)).rejects.toMatchObject({uncertain:false,providerStatus:status})
    }
  })
  it('só confirma atualização da foto/descrição com resposta de sucesso do provedor', async () => {
    const transport=vi.fn().mockResolvedValueOnce(Response.json({update:'success'})).mockResolvedValueOnce(Response.json({update:'failed'})).mockResolvedValueOnce(Response.json({update:'failed'}))
    const client = new AffiliateEvolution(config,transport)
    await client.picture('123@g.us','https://pps.whatsapp.net/photo.jpg')
    expect(transport).toHaveBeenCalledWith(new URL('https://evolution.example/group/updateGroupPicture/Natal%2001'),expect.objectContaining({body:JSON.stringify({groupJid:'123@g.us',image:'https://pps.whatsapp.net/photo.jpg'})}))
    await expect(client.picture('123@g.us','https://pps.whatsapp.net/photo.jpg')).rejects.toMatchObject({uncertain:false})
    await expect(client.describe('123@g.us','Descrição')).rejects.toMatchObject({uncertain:false})
  })
  it('não confirma criação de outra instância nem expõe hash/token na resposta', async () => {
    const transport=vi.fn().mockResolvedValueOnce(Response.json({instance:{instanceName:'Natal 01'},hash:'private'})).mockResolvedValueOnce(Response.json({instance:{instanceName:'Outra'},hash:'private'}))
    const client = new AffiliateEvolution(config,transport)
    expect(await client.createInstance()).toBeUndefined()
    await expect(client.createInstance()).rejects.toMatchObject({uncertain:true})
  })
  it('envia upload WebP como base64 sem exigir URL pública acessível ao provedor',async()=>{
    const transport=vi.fn().mockResolvedValue(Response.json({update:'success'}))
    const bytes=Buffer.from('RIFF0000WEBPVP8Limage').toString('base64')
    const client=new AffiliateEvolution(config,transport)
    await client.picture('123@g.us',bytes)
    expect(transport).toHaveBeenCalledWith(expect.any(URL),expect.objectContaining({body:JSON.stringify({groupJid:'123@g.us',image:bytes})}))
    await expect(client.picture('123@g.us','file:///private.png')).rejects.toMatchObject({status:400})
    expect(transport).toHaveBeenCalledTimes(1)
  })
})

describe('explicit LID alias adapter',()=>{
 it('reads only the trusted participants endpoint and returns sanitized id/phoneNumber pairs',async()=>{
  const transport=vi.fn().mockResolvedValue(Response.json({participants:[{id:'123@lid',phoneNumber:'5511999991234@s.whatsapp.net',name:'discard me',imgUrl:'discard me'},{id:'456@lid',phoneNumber:'456@s.whatsapp.net'}]}))
  const client=new AffiliateEvolution({baseUrl:'https://evolution.example',apiKey:'private-key',instance:'one'},transport)
  expect(await client.participantPhoneAliases('123@g.us')).toEqual([{id:'123@lid',phoneNumber:'5511999991234@s.whatsapp.net'}])
  expect(transport).toHaveBeenCalledWith(new URL('https://evolution.example/group/participants/one?groupJid=123%40g.us'),expect.objectContaining({method:'GET',cache:'no-store'}))
 })
})
