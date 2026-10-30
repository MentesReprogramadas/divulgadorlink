import type { Prisma, PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { AffiliateError } from '@/domain/affiliates/contracts'

export type BroadcastCounts={pending:number;sending:number;sent:number;failed:number;uncertain:number;cancelled:number}
const snapshotSchema=z.object({title:z.string(),priceCents:z.number().int().positive(),oldPriceCents:z.number().int().positive().nullable(),reportedDiscountPercent:z.number().int().min(1).max(100).nullable().optional(),oldPriceEstimated:z.boolean().optional(),imageUrl:z.string().nullable(),affiliateUrl:z.string()})
export function broadcastCounts(rows:Array<{state:string;_count:number}>):BroadcastCounts {
  const count=(states:string[])=>rows.filter(row=>states.includes(row.state)).reduce((sum,row)=>sum+row._count,0)
  return {pending:count(['PENDING']),sending:count(['SENDING']),sent:count(['SENT']),failed:count(['FAILED','DEAD']),uncertain:count(['UNCERTAIN']),cancelled:count(['CANCELLED','SKIPPED'])}
}
export async function affiliateBroadcastStatus(db:PrismaClient,tenantId:string,id:string) {
  const broadcast=await db.affiliateBroadcast.findFirst({where:{id,tenantId}})
  if(!broadcast) throw new AffiliateError(404,'Envio não encontrado.')
  const [rows,deliveries]=await Promise.all([
    db.affiliateDelivery.groupBy({by:['state'],where:{tenantId,broadcastId:id},_count:true}),
    db.affiliateDelivery.findMany({where:{tenantId,broadcastId:id},orderBy:[{createdAt:'asc'},{id:'asc'}],take:100,select:{id:true,state:true,errorCode:true,group:{select:{id:true,name:true}}}}),
  ])
  return {id,counts:broadcastCounts(rows),deliveries,deliveriesLimited:rows.reduce((sum,row)=>sum+row._count,0)>100}
}
export async function affiliateBroadcastHistory(db:PrismaClient,tenantId:string,input:{cursor?:string;limit:number;segmentId?:string}) {
  const where:Prisma.AffiliateBroadcastWhereInput={tenantId,...(input.segmentId?{segmentId:input.segmentId}:{})}
  if(input.segmentId&&!await db.affiliateSegment.count({where:{id:input.segmentId,tenantId}})) throw new AffiliateError(404,'Segmentação não encontrada.')
  const cursor=input.cursor?await db.affiliateBroadcast.findFirst({where:{...where,id:input.cursor},select:{id:true,createdAt:true}}):null
  if(input.cursor&&!cursor) throw new AffiliateError(400,'A página de envios não é válida.')
  const [rows,totalCount]=await Promise.all([
    db.affiliateBroadcast.findMany({where:{...where,...(cursor?{OR:[{createdAt:{lt:cursor.createdAt}},{createdAt:cursor.createdAt,id:{lt:cursor.id}}]}:{})},orderBy:[{createdAt:'desc'},{id:'desc'}],take:input.limit+1,include:{offer:{select:{id:true,title:true,priceCents:true,oldPriceCents:true,imageUrl:true,affiliateUrl:true}}}}),
    db.affiliateBroadcast.count({where}),
  ])
  const page=rows.slice(0,input.limit)
  const [states,segments]=page.length?await Promise.all([
    db.affiliateDelivery.groupBy({by:['broadcastId','state'],where:{tenantId,broadcastId:{in:page.map(row=>row.id)}},_count:true}),
    db.affiliateSegment.findMany({where:{tenantId,id:{in:page.map(row=>row.segmentId)}},select:{id:true,name:true}}),
  ]):[[],[]]
  return {broadcasts:page.map(row=>{
    const snapshot=snapshotSchema.safeParse(row.productSnapshot)
    const offer=snapshot.success?{id:row.offer.id,...snapshot.data}:{id:row.offer.id,title:row.message.split('\n')[0].replace(/^\*|\*$/g,'')||'Envio anterior',priceCents:null,oldPriceCents:null,imageUrl:row.imageUrl,affiliateUrl:null}
    return {...row,offer,snapshotAvailable:snapshot.success,segment:segments.find(segment=>segment.id===row.segmentId)??{id:row.segmentId,name:'Segmentação'},counts:broadcastCounts(states.filter(state=>state.broadcastId===row.id))}
  }),nextCursor:rows.length>input.limit?page[page.length-1].id:null,totalCount}
}
