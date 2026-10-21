import {z} from 'zod'
import {transition} from '@/domain/state/transition'
export const contactStatus=z.enum(['NEW','IN_PROGRESS','DONE'])
export type ContactStatus=z.infer<typeof contactStatus>
export const contactVersion=z.number().int().min(0).max(2147483646)
export const contactStatusInput=z.object({status:contactStatus,expectedVersion:contactVersion}).strict()
export const contactNoteInput=z.object({id:z.string().uuid(),text:z.string().trim().min(1).max(2000),expectedVersion:contactVersion}).strict()
export function nextContactState(current:{status:ContactStatus;firstHandledAt:Date|null},status:ContactStatus,now:Date){
 const machine={NEW:['NEW','IN_PROGRESS','DONE'],IN_PROGRESS:['NEW','IN_PROGRESS','DONE'],DONE:['NEW','IN_PROGRESS','DONE']} as const
 return{status:transition(machine,current.status,status),firstHandledAt:current.firstHandledAt??(status==='NEW'?null:now)}
}
