import type { Prisma, PrismaClient } from '@prisma/client'
import type { CatalogProduct } from '@/domain/affiliates/mercado-livre'

export async function affiliateProductHistory<T extends CatalogProduct>(db:Pick<PrismaClient|Prisma.TransactionClient,'affiliateBroadcast'|'affiliateScheduledOffer'>,tenantId:string,segmentId:string,products:T[]){
  if(!products.length)return []
  const [broadcasts,scheduled]=await Promise.all([
    db.affiliateBroadcast.findMany({where:{tenantId,segmentId,offer:{OR:[{itemId:{in:products.map(p=>p.id)}},{productUrl:{in:products.map(p=>p.productUrl)}}]}},select:{offer:{select:{itemId:true,productUrl:true}},deliveries:{select:{state:true,updatedAt:true}}}}),
    db.affiliateScheduledOffer.findMany({where:{tenantId,itemId:{in:products.map(p=>p.id)},batch:{segmentId,status:'APPROVED'},state:{in:['PENDING','PROCESSING']}},select:{itemId:true}}),
  ])
  return products.map(product=>{
    const rows=broadcasts.filter(b=>b.offer.itemId===product.id||b.offer.productUrl===product.productUrl)
    const sent=rows.filter(row=>row.deliveries.some(d=>d.state==='SENT'))
    const dates=sent.flatMap(row=>row.deliveries.filter(d=>d.state==='SENT').map(d=>d.updatedAt.getTime()))
    return {...product,sentCount:sent.length,pendingCount:rows.filter(row=>row.deliveries.some(d=>['PENDING','SENDING','UNCERTAIN'].includes(d.state))).length+scheduled.filter(row=>row.itemId===product.id).length,lastSentAt:dates.length?new Date(dates.reduce((max,date)=>Math.max(max,date),0)).toISOString():null}
  })
}
