import {expect,it,vi} from 'vitest'
import {renderOperationalMessage} from './evolution-operations'
it('identifica link permanente em revisão/decisão sem confundir com equipe ou mudar comandos',()=>{
 const network=vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('Não enviar mensagens reais'))
 try{
  const payload={resourceType:'REDIRECT',name:'Grupo de estudos',canonicalUrl:'https://example.com/grupo',ownerName:'Ana',version:1}
  const review=renderOperationalMessage({id:'review-fixture',kind:'REVIEW_REDIRECT',payload},'fixture','https://tenant.example.test')
  expect(review).toContain('🔁 *LINK PERMANENTE EM REVISÃO*');expect(review).toContain('*Link permanente*');expect(review).toContain('*APROVAR*');expect(review).toContain('*RECUSAR motivo*');expect(review).not.toMatch(/convite/i)
  const decision=renderOperationalMessage({id:'decision-fixture',kind:'DECISION',payload:{...payload,decision:'APPROVE'}},'fixture','https://tenant.example.test');expect(decision).toContain('LINK PERMANENTE • APROVADO');expect(decision).toContain('Link de destino liberado.');expect(network).not.toHaveBeenCalled()
 }finally{network.mockRestore()}
})
