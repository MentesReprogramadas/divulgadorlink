import {expect,it} from 'vitest'
import {openWebhookSecret,sealWebhookSecret} from './webhook-secret'
it('F30-T01 segredo cifrado e vinculado ao endpoint; configuração ausente e troca de tenant falham',()=>{
 const master=Buffer.alloc(32,7).toString('base64'),sealed=sealWebhookSecret('private-secret',master,'tenant:owner:endpoint')
 expect(sealed).not.toContain('private-secret');expect(openWebhookSecret(sealed,master,'tenant:owner:endpoint')).toBe('private-secret')
 expect(()=>openWebhookSecret(sealed,master,'foreign:owner:endpoint')).toThrow();expect(()=>sealWebhookSecret('secret',undefined,'context')).toThrow()
})
