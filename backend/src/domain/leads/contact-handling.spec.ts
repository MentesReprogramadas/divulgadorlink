import {expect,it} from 'vitest'
import {contactStatusInput,nextContactState,contactNoteInput} from './contact-handling'
it('F35-U01 status e notas são estritos e limitados',()=>{
 expect(contactStatusInput.safeParse({status:'SENT',expectedVersion:0}).success).toBe(false)
 expect(contactNoteInput.safeParse({id:crypto.randomUUID(),text:' ',expectedVersion:0}).success).toBe(false)
})
it('F35-U02 primeira ação preserva timestamp ao concluir e reabrir',()=>{
 const first=new Date('2026-10-21T12:00:00Z'),later=new Date('2026-10-22T12:00:00Z')
 const handled=nextContactState({status:'NEW',firstHandledAt:null},'IN_PROGRESS',first)
 expect(nextContactState(handled,'DONE',later).firstHandledAt).toEqual(first)
 expect(nextContactState(handled,'NEW',later).firstHandledAt).toEqual(first)
 expect(nextContactState({status:'NEW',firstHandledAt:null},'DONE',first).firstHandledAt).toEqual(first)
})
