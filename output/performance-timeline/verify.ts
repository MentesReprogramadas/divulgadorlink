import { writeFileSync } from 'node:fs'
import '../../backend/node_modules/dotenv/config'
import { PrismaClient } from '../../backend/node_modules/@prisma/client'
import { promotionPerformance } from '../../backend/src/use-cases/@Analytics/promotion-performance'
import { PrismaPromotionPerformanceRepository } from '../../backend/src/repositories/promotion-performance-repository'
const db=new PrismaClient()
async function main(){
 const link=await db.link.findUniqueOrThrow({where:{id:'cmvebrmuu0004u44wmam8kh2q'},select:{id:true,tenantId:true,ownerId:true}})
 const report=await promotionPerformance({linkId:link.id,tenantId:link.tenantId,actorId:link.ownerId},new PrismaPromotionPerformanceRepository(db))
 if(!report || report.dataState!=='RECORDED' || report.daily.filter(row=>row.clicks>0).length<20) throw Error('Histórico local incompleto')
 const proof={linkId:report.link.id,from:report.from,to:report.to,days:report.days,totals:report.totals,coverage:report.coverage,daysWithClicks:report.daily.filter(row=>row.clicks>0).length,surfaces:report.surfaces.filter(row=>row.impressions>0)}
 writeFileSync('../output/performance-timeline/report-proof.json',JSON.stringify(proof,null,2))
 console.log(JSON.stringify(proof))
}
main().finally(()=>db.$disconnect())
