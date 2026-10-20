from pathlib import Path
import shutil
r=Path('C:/VSCODE/divulgadorlinks');out=r/'docs/frontend-profissional/evidencias/f10-2026-10-20/falha-host-header';out.mkdir(parents=True,exist_ok=True)
report=r/'frontend/test-results/results.json'
if report.exists():shutil.copy2(report,r/'output/f10-playwright-second.json')
for d in (r/'frontend/test-results').iterdir():
 if d.is_dir() and (d/'error-context.md').exists():shutil.copytree(d,out/d.name,dirs_exist_ok=True)
p=r/'backend/src/repositories/profile-hosts.ts';s=p.read_text(encoding='utf-8');s+='''
/** Global public lookup: hostname and the configured root determine the tenant, never a forwarded Host. */
export async function resolveConfiguredProfileHost(db:PrismaClient,hostname:string,challenge?:string){
 const configured=Object.entries(configuredHostBases()).find(([base])=>hostname.endsWith('.'+base)&&!hostname.slice(0,-base.length-1).includes('.'));if(!configured)throw missing();const tenant=await db.tenant.findUnique({where:{host:configured[1]}});if(!tenant)throw missing();return resolveProfileHost(db,tenant.id,hostname,challenge)
}
''';p.write_text(s,encoding='utf-8')
p=r/'backend/src/http/controllers/@Profiles/routes.ts';s=p.read_text(encoding='utf-8');old=next(line for line in s.splitlines() if "app.get('/profile-hosts/resolve'" in line);new='''  app.get('/profile-hosts/resolve',async(q,r)=>{
    r.header('cache-control','private, no-store').header('x-content-type-options','nosniff')
    try{const input=z.object({hostname:z.string().regex(/^[a-z0-9.-]{3,253}$/),challenge:z.string().regex(/^[a-f0-9]{64}$/).optional()}).strict().parse(q.query);return await hosts.resolveConfiguredProfileHost(testDb??prisma,input.hostname,input.challenge)}
    catch(error){if(error instanceof ZodError)return r.code(400).send(buildError({code:'validation',message:'Endereço inválido.',request_id:q.id}));if(error instanceof ProfileError)return r.code(error.status).send(buildError({code:'not_found',message:'Endereço não encontrado.',request_id:q.id}));throw new Error('Não foi possível resolver o endereço da página.')}
  })''';s=s.replace(old,new);p.write_text(s,encoding='utf-8')
p=r/'frontend/src/middleware.ts';s=p.read_text(encoding='utf-8').replace("{headers:{host:personal.tenantHost},cache:'no-store'", "{cache:'no-store'");p.write_text(s,encoding='utf-8')
p=r/'backend/src/http/profile-hosts.pg.spec.ts';s=p.read_text(encoding='utf-8').replace("expect((await resolve('ana.pages-'+tenant+'.test',foreign)).statusCode).toBe(404)","expect((await resolve('ana.pages-'+tenant+'.test',foreign)).json().tenantHost).toBe(tenant+'.test')");p.write_text(s,encoding='utf-8')
p=r/'backend/scripts/e2e-profile-hosts.ts';s=p.read_text(encoding='utf-8');s="import {request} from 'node:http'\n"+s;start=s.index("  const port=3000+");end=s.index('\n })',start);s=s[:start]+'''  const port=3000+Number(process.env.E2E_PORT_OFFSET||0)
  return new Promise<boolean>((resolve,reject)=>{const req=request({hostname:'127.0.0.1',port,path:'/.well-known/temlink-page/'+challenge,headers:{host:hostname+':'+port}},response=>{let body='';response.on('data',chunk=>{body+=String(chunk);if(body.length>4096)req.destroy(new Error('Fixture body too large'))});response.on('end',()=>resolve(response.statusCode===200&&body==='temlink-page='+challenge))});req.on('error',reject);req.setTimeout(5000,()=>req.destroy(new Error('Fixture timeout')));req.end()})'''+s[end:];p.write_text(s,encoding='utf-8')
p=r/'docs/planejamento-features/decisoes.md';s=p.read_text(encoding='utf-8');s+='\nF10: o ensaio real mostrou que fetch pode descartar Host. O resolver público global agora deriva tenant somente de hostname cadastrado + mapa de raízes no servidor; Host/X-Forwarded-Host do chamador não trocam o proprietário. Retorna apenas slug/host públicos, sem sessão, dono ou rascunho. A prova HTTP descartável usa transporte nativo para exercer Host real; o adapter de produção continua HTTPS com DNS fixado e SNI.\n';p.write_text(s,encoding='utf-8')
