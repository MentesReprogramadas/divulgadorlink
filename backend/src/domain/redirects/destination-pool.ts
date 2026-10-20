import {z} from 'zod'
export const destinationPoolInput=z.object({expectedVersion:z.number().int().nonnegative().max(2147483646),destinations:z.array(z.object({revisionId:z.string().uuid(),weight:z.number().int().min(1).max(100),paused:z.boolean()}).strict()).max(20)}).strict().refine(v=>new Set(v.destinations.map(r=>r.revisionId)).size===v.destinations.length,'Não repita destinos.')
export type DestinationPoolInput=z.infer<typeof destinationPoolInput>
export function selectWeighted<T extends {weight:number;paused:boolean}>(rows:T[],cursor:number):T|null{
 if(!Number.isSafeInteger(cursor)||cursor<0||rows.some(r=>!Number.isInteger(r.weight)||r.weight<1||r.weight>100))throw new Error('Distribuição inválida.')
 const eligible=rows.filter(row=>!row.paused),total=eligible.reduce((sum,row)=>sum+row.weight,0);if(!total)return null
 let position=cursor%total;for(const row of eligible){if(position<row.weight)return row;position-=row.weight}return null
}
