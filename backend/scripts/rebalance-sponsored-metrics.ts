import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { Prisma, PrismaClient } from '@prisma/client'
import { simulationConfig, simulationHash, trafficConfigForLink } from '../src/domain/analytics/traffic-simulation'
import { assertDevelopment } from '../src/use-cases/@Analytics/simulate-traffic'

// Development repair: thin only visits belonging to explicitly named generator runs.
// Preserve full removed rows in the audit record for transactional restoration.
async function main() {
 const {values}=parseArgs({options:{tenant:{type:'string'},run:{type:'string'},config:{type:'string'},sources:{type:'string'},apply:{type:'boolean'},rollback:{type:'boolean'},'remote-development':{type:'boolean'}}})
 assertDevelopment(process.env.NODE_ENV,process.env.DATABASE_URL??'',!values.apply,values['remote-development'])
 if(!values.tenant||!values.run)throw new Error('Informe --tenant e --run')
 const tenant=values.tenant, run=values.run, auditId=`dev-metrics-rebalance:${simulationHash(`${tenant}:${run}`)}`
 const db=new PrismaClient()
 try { await db.$transaction(async tx=>{
  if(!values.apply)await tx.$executeRaw`SET TRANSACTION READ ONLY`
  else await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`dev-metrics:${tenant}`}))`
  const existing=await tx.auditLog.findUnique({where:{id:auditId}})
  if(values.rollback){
   if(!existing||existing.tenantId!==tenant)throw new Error('Correção não encontrada')
   const rows=(existing.after as {rows:Prisma.JsonArray}).rows
   if(values.apply&&existing.action!=='DEV_METRICS_REBALANCE_RESTORED'){
    await tx.$executeRaw`INSERT INTO analytics_events SELECT * FROM jsonb_populate_recordset(NULL::analytics_events, ${JSON.stringify(rows)}::jsonb) ON CONFLICT DO NOTHING`
    await tx.auditLog.update({where:{id:auditId},data:{action:'DEV_METRICS_REBALANCE_RESTORED'}})
   }
   console.log(JSON.stringify({run,dryRun:!values.apply,restoreEvents:rows.length}));return
  }
  if(!values.config||!values.sources)throw new Error('Informe --config e --sources com os lotes gerados autorizados')
  const config=simulationConfig.parse(JSON.parse(readFileSync(values.config,'utf8')))
  if(config.sponsoredCeilingMinViews===undefined)throw new Error('Configure sponsoredCeilingMinViews')
  const sources=values.sources.split(',').filter(Boolean).sort()
  const identity=JSON.stringify({config,sources})
  if(existing){
   if((existing.after as {identity:string}).identity!==identity)throw new Error('Correção existente com outra configuração')
   if(existing.action==='DEV_METRICS_REBALANCE_RESTORED')throw new Error('Correção revertida; escolha outra run')
   console.log(JSON.stringify({run,alreadyApplied:true}));return
  }
  const prefixes:string[]=[]
  for(const source of sources){
   const key=simulationHash(`${tenant}:${source}`)
   const manifest=await tx.auditLog.findUnique({where:{id:`dev-metrics:${key}`}})
   if(manifest?.action!=='DEV_METRICS_STARTED'||manifest.tenantId!==tenant)throw new Error(`Lote ativo não encontrado: ${source}`)
   prefixes.push(`dev-metrics:${key}:`)
  }
  const links=await tx.link.findMany({where:{tenantId:tenant,promotions:{some:{status:'ACTIVE',activatedAt:{lte:new Date(config.until)},OR:[{expiresAt:null},{expiresAt:{gt:new Date(config.until)}}]}}},select:{id:true,tenantId:true,createdAt:true,name:true}})
  const removed:Prisma.JsonArray=[]
  const report=[]
  for(const link of links){
   const generated=await tx.analyticsEvent.findMany({where:{tenantId:tenant,linkId:link.id,kind:'IMPRESSION',OR:prefixes.map(prefix=>({sessionId:{startsWith:prefix}}))},select:{sessionId:true}})
   const before=await tx.analyticsEvent.count({where:{tenantId:tenant,linkId:link.id,kind:'IMPRESSION'}})
   const ceiling=trafficConfigForLink(config,true,link).maxViews
   const removeCount=Math.min(generated.length,Math.max(0,before-ceiling))
   // Hash ranking spreads removals across the full history, keeping each visit's funnel intact.
   const sessions=generated.sort((a,b)=>simulationHash(`${config.seed}:${a.sessionId}:thin`).localeCompare(simulationHash(`${config.seed}:${b.sessionId}:thin`))).slice(0,removeCount).map(v=>v.sessionId)
   if(sessions.length){
    const rows=await tx.$queryRaw<Array<{row:Prisma.JsonObject}>>`SELECT to_jsonb(a) AS row FROM analytics_events a WHERE a."tenantId"=${tenant} AND a."linkId"=${link.id} AND a."sessionId" IN (${Prisma.join(sessions)})`
    removed.push(...rows.map(row=>row.row))
    if(values.apply)await tx.analyticsEvent.deleteMany({where:{tenantId:tenant,linkId:link.id,sessionId:{in:sessions}}})
   }
   report.push({linkId:link.id,name:link.name,before,after:before-removeCount,ceiling,removedViews:removeCount})
  }
  if(values.apply)await tx.auditLog.create({data:{id:auditId,tenantId:tenant,action:'DEV_METRICS_REBALANCED',entityType:'AnalyticsSimulationCorrection',entityId:run,after:{identity,rows:removed,report}}})
  console.log(JSON.stringify({run,dryRun:!values.apply,report,removedEvents:removed.length}))
 },{timeout:60000}) } finally {await db.$disconnect()}
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Falha na correção');process.exitCode=1})
