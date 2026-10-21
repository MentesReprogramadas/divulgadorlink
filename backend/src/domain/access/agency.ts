import {z} from 'zod'
export const agencyClientInput=z.object({profileId:z.string().uuid(),name:z.string().trim().min(1).max(80)}).strict()
export const agencyAccessInput=z.object({clientId:z.string().uuid(),userId:z.string().min(1).max(128),role:z.enum(['EDITOR','VIEWER']),requestKey:z.string().uuid()}).strict()
export const agencyTransferInput=z.object({profileId:z.string().uuid(),recipientEmail:z.string().trim().email().max(254),expectedVersion:z.number().int().min(0).max(2147483646),consent:z.literal(true),requestKey:z.string().uuid()}).strict()
export function agencyClientCapacity(active:number,maximum:number){return Number.isSafeInteger(active)&&Number.isSafeInteger(maximum)&&active>=0&&maximum>0&&active<maximum}
export function agencyTransferReady(request:{status:string;expiresAt:Date;profileVersion:number},now:Date,currentVersion:number,hasPage:boolean){return request.status==='PENDING'&&request.expiresAt>now&&request.profileVersion===currentVersion&&!hasPage}
