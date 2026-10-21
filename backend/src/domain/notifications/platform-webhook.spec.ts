import {expect,it} from 'vitest'
import {webhookEndpointInput,webhookSignature,verifyWebhook,webhookBackoff} from './platform-webhook'
it('F30-U02/T01 autentica corpo e timestamp; rotação aceita assinaturas durante a janela',()=>{
 const timestamp='1792576800',now=new Date(Number(timestamp)*1000),body='{"eventId":"stable"}',secret='test-secret',sig='v1='+webhookSignature(secret,timestamp,body)
 expect(verifyWebhook(secret,timestamp,body,sig,now)).toBe(true)
 expect(verifyWebhook(secret,timestamp,body+'x',sig,now)).toBe(false)
 expect(verifyWebhook(secret,timestamp,body,sig,new Date(now.getTime()+301000))).toBe(false)
 expect(verifyWebhook('other',timestamp,body,sig,now)).toBe(false)
 expect(verifyWebhook(secret,timestamp,body,'v1='+webhookSignature('new',timestamp,body)+','+sig,now)).toBe(true)
})
it('F30-U03/T06 bloqueia rede interna, HTTP, credenciais e portas; limita eventos',()=>{
 for(const url of ['http://example.com','https://localhost','https://127.0.0.1','https://[::1]','https://example.com:444','https://u:p@example.com'])expect(webhookEndpointInput.safeParse({url,eventTypes:['contact.received'],enabled:true}).success).toBe(false)
 expect(webhookEndpointInput.safeParse({url:'https://example.com/hooks',eventTypes:['contact.received'],enabled:true}).success).toBe(true)
 expect(webhookBackoff(5)).toBe(900000)
})
