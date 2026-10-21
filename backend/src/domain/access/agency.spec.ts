import {expect,it} from 'vitest'
import {agencyClientCapacity,agencyTransferInput,agencyTransferReady} from './agency'
it('F36-U03 limite não permite criar cliente extra nem exige remover existentes',()=>{expect(agencyClientCapacity(9,10)).toBe(true);expect(agencyClientCapacity(10,10)).toBe(false);expect(agencyClientCapacity(11,10)).toBe(false)})
it('F36-U04 transferência exige consentimento, versão e destino sem página',()=>{
 const now=new Date('2026-10-21T12:00:00Z'),request={status:'PENDING',expiresAt:new Date(+now+1),profileVersion:2};expect(agencyTransferReady(request,now,2,false)).toBe(true);expect(agencyTransferReady(request,now,3,false)).toBe(false);expect(agencyTransferReady(request,now,2,true)).toBe(false);expect(agencyTransferReady(request,new Date(+now+1),2,false)).toBe(false);expect(()=>agencyTransferInput.parse({profileId:crypto.randomUUID(),recipientEmail:'pessoa@example.com',expectedVersion:2,requestKey:crypto.randomUUID()})).toThrow()
})
