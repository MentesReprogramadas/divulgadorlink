const {createHash} = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
require(path.resolve('backend/node_modules/dotenv')).config({path:path.resolve('backend/.env'),quiet:true});
const {PrismaClient} = require(path.resolve('backend/node_modules/@prisma/client'));
const linkId = 'cmvebrmuu0004u44wmam8kh2q';
const tenantId = 'cmuplgz2o0000u4ac5vwcqtxl';
const prefix = 'dev-performance-timeline-20261018:' + linkId + ':';
const db = new PrismaClient();
async function main() {
  if (!['localhost','127.0.0.1','::1'].includes(new URL(process.env.DATABASE_URL).hostname) || !['dev','development','test'].includes(process.env.NODE_ENV)) throw Error('Somente banco local de desenvolvimento.');
  const link = await db.link.findFirstOrThrow({where:{id:linkId,tenantId},select:{id:true,name:true,createdAt:true}});
  const where = {tenantId,linkId,sessionId:{startsWith:prefix}};
  if (process.argv.includes('--rollback')) {const removed=await db.analyticsEvent.deleteMany({where}); console.log(JSON.stringify({removed:removed.count,prefix})); return;}
  const rows=[];
  const end = new Date('2026-10-18T03:00:00.000Z');
  for(let i=0;i<60;i++) {
    const start=new Date(end.getTime()-(59-i)*86400000);
    const current = i===59;
    const count=Math.round((105+i*3+65*(1+Math.sin(i*.57))+(i%9===0?120:0))*(current?.45:1));
    for(let j=0;j<count;j++) {
      const surface=j%4===0?'RELATED':'ORGANIC';
      const sessionId=prefix+i+':'+j;
      const at = new Date(start.getTime()+j/count*(current?12:23)*3600000);
      const base={tenantId,linkId,sessionId,surface,day:new Date(start.toISOString().slice(0,10)+'T00:00Z'),createdAt:at,updatedAt:at,type:'REAL',simulationId:null};
      rows.push({...base,id:createHash('sha256').update(sessionId+':IMPRESSION').digest('hex').slice(0,32),kind:'IMPRESSION'});
      if(j%Math.max(5,Math.round(9+3*Math.sin(i*.3)))===0) rows.push({...base,id:createHash('sha256').update(sessionId+':CLICK').digest('hex').slice(0,32),kind:'CLICK'});
    }
  }
  let inserted=0;
  for(let i=0;i<rows.length;i+=500) inserted+=(await db.analyticsEvent.createMany({data:rows.slice(i,i+500),skipDuplicates:true})).count;
  const counts=await db.analyticsEvent.groupBy({by:['kind'],where,_count:true});
  const manifest={link,tenantId,prefix,inserted,counts,from:'2026-08-20',to:'2026-10-18',note:'Dados demonstrativos locais anteriores à criação do link para inspeção da timeline. Sessões isoladas para reversão; tipo REAL segue contrato do simulador local existente. Nenhuma promoção/pagamento modificado.',rollback:'node output/performance-timeline/seed.cjs --rollback'};
  fs.writeFileSync(path.resolve('output/performance-timeline/seed-manifest.json'),JSON.stringify(manifest,null,2));
  console.log(JSON.stringify(manifest));
}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>db.$disconnect());
