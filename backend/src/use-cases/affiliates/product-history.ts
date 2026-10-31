import type { Prisma, PrismaClient } from '@prisma/client'
import type { CatalogProduct } from '@/domain/affiliates/mercado-livre'

export async function affiliateProductHistory<T extends CatalogProduct>(db:Pick<PrismaClient|Prisma.TransactionClient,'affiliateBroadcast'|'affiliateScheduledOffer'>,tenantId:string,segmentId:string,products:T[]){
  if(!products.length)return []
  const [broadcasts,scheduled]=await Promise.all([
    db.affiliateBroadcast.findMany({where:{tenantId,segmentId},select:{productSnapshot:true,offer:{select:{itemId:true,productUrl:true}},deliveries:{select:{state:true,updatedAt:true}}}}),
    db.affiliateScheduledOffer.findMany({where:{tenantId,itemId:{in:products.map(p=>p.id)},batch:{segmentId,status:'APPROVED'},state:{in:['PENDING','PROCESSING']}},select:{itemId:true}}),
  ])
  const totals=new Map<string,{sent:number;pending:number;last:number}>()
  for(const row of broadcasts){
    const snapshot=row.productSnapshot&&typeof row.productSnapshot==='object'&&!Array.isArray(row.productSnapshot)?row.productSnapshot:{}
    const itemId='itemId' in snapshot?snapshot.itemId:row.offer.itemId,url='productUrl' in snapshot?snapshot.productUrl:row.offer.productUrl
    const key=typeof itemId==='string'?'id:'+itemId:'url:'+String(url),value=totals.get(key)??{sent:0,pending:0,last:0}
    if(row.deliveries.some(d=>d.state==='SENT'))value.sent++
    if(row.deliveries.some(d=>['PENDING','SENDING','UNCERTAIN'].includes(d.state)))value.pending++
    for(const delivery of row.deliveries)if(delivery.state==='SENT')value.last=Math.max(value.last,delivery.updatedAt.getTime())
    totals.set(key,value)
  }
  const scheduledCounts=new Map<string,number>()
  for(const entry of scheduled)scheduledCounts.set(entry.itemId,(scheduledCounts.get(entry.itemId)??0)+1)
  return products.map(product=>{
    const byId=totals.get('id:'+product.id),byUrl=totals.get('url:'+product.productUrl),last=Math.max(byId?.last??0,byUrl?.last??0)
    return {...product,sentCount:(byId?.sent??0)+(byUrl?.sent??0),pendingCount:(byId?.pending??0)+(byUrl?.pending??0)+(scheduledCounts.get(product.id)??0),lastSentAt:last?new Date(last).toISOString():null}
  })
}
