import {createHash,createHmac,randomUUID} from 'node:crypto'
import {Prisma,type PrismaClient} from '@prisma/client'
import {contactDefinition,defaultContact,parseAnswers,csvCell,type ContactDefinition} from '@/domain/leads/contact-form'
import {ProfileError} from '@/domain/profiles/profile'
import type {ProfileActor} from '@/domain/access/profile-access'
import {assertProfileOwner,publicProfileProjection} from './profiles-repository'
type Db=Prisma.TransactionClient
type Form={id:string;tenantId:string;profileId:string;version:number}
type Revision={id:string;number:number;definition:ContactDefinition}
type Submission={id:string;revisionId:string;answers:Record<string,string>;marketingOptIn:boolean;createdAt:Date;expiresAt:Date;fingerprint:string;status:'NEW'|'IN_PROGRESS'|'DONE';version:number;sourceSlug:string;firstHandledAt:Date|null}
export async function purgeContacts(db:PrismaClient,now=new Date()){
 await db.$executeRaw`DELETE FROM contact_submissions WHERE "expiresAt"<=${now}`
 await db.$executeRaw`DELETE FROM contact_rate_buckets WHERE "expiresAt"<=${now}`
}
async function owned(tx:Db,a:ProfileActor,write=false){await assertProfileOwner(tx,a,write);const p=await tx.profile.findUnique({where:{tenantId_ownerId:{tenantId:a.tenantId,ownerId:a.ownerId}},select:{id:true}});if(!p)throw new ProfileError(404,'Salve sua página antes de configurar contatos.');return p}
export {owned as assertContactPage}
async function latest(tx:Db,id:string){const rows=await tx.$queryRaw<Revision[]>`SELECT id,number,definition FROM contact_form_revisions WHERE "formId"=${id}::text ORDER BY number DESC LIMIT 1`;return rows[0]}
async function formFor(tx:Db,profileId:string){return (await tx.$queryRaw<Form[]>`SELECT * FROM contact_forms WHERE "profileId"=${profileId}::text`)[0]}
export async function readContactForm(db:PrismaClient,a:ProfileActor){const p=await owned(db,a);const f=await formFor(db,p.id),rev=f?await latest(db,f.id):null;return{version:f?.version??0,revisionId:rev?.id??null,definition:rev?.definition??defaultContact}}
export async function saveContactForm(db:PrismaClient,a:ProfileActor,definition:ContactDefinition,expectedVersion:number){return db.$transaction(async tx=>{
 const p=await owned(tx,a,true);await tx.$queryRaw`SELECT id FROM profiles WHERE id=${p.id}::text FOR UPDATE`;let f=await formFor(tx,p.id);if((f?.version??0)!==expectedVersion)throw new ProfileError(409,'O formulário mudou. Atualize antes de salvar.')
 if(!f){const id=randomUUID();await tx.$executeRaw`INSERT INTO contact_forms(id,"tenantId","profileId","ownerId") VALUES(${id}::text,${a.tenantId},${p.id}::text,${a.ownerId})`;f={id,tenantId:a.tenantId,profileId:p.id,version:0}}
 await tx.$executeRaw`UPDATE contact_forms SET version=version+1 WHERE id=${f.id}::text`
 await tx.$executeRaw`INSERT INTO contact_form_revisions(id,"tenantId","formId",number,definition) VALUES(${randomUUID()}::text,${a.tenantId},${f.id}::text,${f.version+1},${JSON.stringify(contactDefinition.parse(definition))}::jsonb)`
 await tx.auditLog.create({data:{tenantId:a.tenantId,actorId:a.auditActorId??a.actorId??a.ownerId,action:'contact.form.configured',entityType:'ContactForm',entityId:f.id,after:{version:f.version+1}}})
 return{version:f.version+1,definition}
})}
async function publiclyAvailable(tx:Db,tenantId:string,slug:string,age:boolean){const page=await publicProfileProjection(tx,tenantId,slug,age);if(page.restricted)throw new ProfileError(403,'Confirme sua idade antes de continuar.');const profile=await tx.profile.findUnique({where:{tenantId_slug:{tenantId,slug}},select:{id:true}});if(!profile)throw new ProfileError(404,'Página indisponível.');return profile}
export async function publicContactForm(db:PrismaClient,tenantId:string,slug:string,age:boolean){return db.$transaction(async tx=>{const p=await publiclyAvailable(tx,tenantId,slug,age),f=await formFor(tx,p.id),rev=f?await latest(tx,f.id):null;return{form:rev?.definition.enabled?{id:f!.id,revisionId:rev.id,definition:rev.definition}:null}})}
export async function submitContact(db:PrismaClient,scope:{tenantId:string;slug:string;age:boolean;secret:string},input:{revisionId:string;requestKey:string;answers:unknown;marketingOptIn:boolean;website:string},now=new Date()){
 return db.$transaction(async tx=>{
 const p=await publiclyAvailable(tx,scope.tenantId,scope.slug,scope.age),f=await formFor(tx,p.id);if(!f)throw new ProfileError(404,'Formulário indisponível.');await tx.$queryRaw`SELECT id FROM contact_forms WHERE id=${f.id}::text FOR UPDATE`
 const hash=createHash('sha256').update(JSON.stringify({revisionId:input.revisionId,answers:input.answers,marketingOptIn:input.marketingOptIn})).digest('hex')
 const previous=(await tx.$queryRaw<Submission[]>`SELECT * FROM contact_submissions WHERE "formId"=${f.id}::text AND "requestKey"=${input.requestKey}::text AND "expiresAt">${now}`)[0]
 if(previous){if(previous.fingerprint!==hash)throw new ProfileError(409,'Esta tentativa já foi usada. Reabra o formulário.');return{id:previous.id,createdAt:previous.createdAt}}
 const rev=await latest(tx,f.id);if(!rev?.definition.enabled||rev.id!==input.revisionId)throw new ProfileError(409,'O formulário mudou. Atualize a página antes de enviar.')
 const answers=parseAnswers(rev.definition,input.answers);if(input.marketingOptIn&&!rev.definition.marketingAllowed)throw new ProfileError(400,'Preferência de novidades indisponível.');if(input.website)throw new ProfileError(429,'Aguarde antes de tentar novamente.')
 const identity=answers.email?.trim().toLocaleLowerCase('en-US')||answers.phone?.replace(/[^0-9]/g,'');if(!identity)throw new ProfileError(400,'Informe e-mail ou telefone para contato.');const digest=createHmac('sha256',scope.secret).update('contact-rate-v1\0'+scope.tenantId+'\0'+f.id+'\0'+identity).digest('hex')
 for(const [windowMs,limit,subject] of [[600000,5,digest],[3600000,100,'form']] as const){const start=Math.floor(now.getTime()/windowMs)*windowMs,key=f.id+':'+subject+':'+start;const row=await tx.$queryRaw<{count:number}[]>`INSERT INTO contact_rate_buckets(key,"formId",count,"expiresAt") VALUES(${key},${f.id}::text,1,${new Date(start+windowMs)}) ON CONFLICT(key) DO UPDATE SET count=contact_rate_buckets.count+1 RETURNING count`;if(row[0]!.count>limit)throw new ProfileError(429,'Limite de envios atingido. Tente mais tarde.')}
 const id=randomUUID();await tx.$executeRaw`INSERT INTO contact_submissions(id,"tenantId","formId","revisionId","requestKey",fingerprint,answers,"marketingOptIn","createdAt","expiresAt") VALUES(${id}::text,${scope.tenantId},${f.id}::text,${rev.id}::text,${input.requestKey}::text,${hash},${JSON.stringify(answers)}::jsonb,${input.marketingOptIn},${now},${new Date(now.getTime()+180*86400000)})`
 return{id,createdAt:now}
 })
}
export async function listContacts(db:PrismaClient,a:ProfileActor,cursor?:string,now=new Date(),status?:Submission['status']){
 const p=await owned(db,a),f=await formFor(db,p.id);if(!f)return{items:[],nextCursor:null}
 await db.$executeRaw`DELETE FROM contact_submissions WHERE "formId"=${f.id}::text AND "expiresAt"<=${now}`
 const rows=await db.$queryRaw<Submission[]>`SELECT id,"revisionId",answers,"marketingOptIn","createdAt","expiresAt",status,version,"sourceSlug","firstHandledAt" FROM contact_submissions WHERE "formId"=${f.id}::text AND "expiresAt">${now} AND (${status??null}::text IS NULL OR status=${status??null}::text) AND (${cursor??null}::text IS NULL OR id>${cursor??null}::text) ORDER BY id LIMIT 26`
 return{items:rows.slice(0,25),nextCursor:rows.length>25?rows[24]!.id:null}
}
export async function deleteContact(db:PrismaClient,a:ProfileActor,id:string){return db.$transaction(async tx=>{const p=await owned(tx,a,true),f=await formFor(tx,p.id);if(!f)throw new ProfileError(404,'Contato não encontrado.');await tx.$executeRaw`DELETE FROM contact_submissions WHERE id=${id}::text AND "formId"=${f.id}::text`;return{deleted:true}})}
export async function exportContacts(db:PrismaClient,a:ProfileActor,cursor?:string,status?:Submission['status']){const page=await listContacts(db,a,cursor,new Date(),status);const keys=['name','email','phone','company','message'] as const;await db.auditLog.create({data:{tenantId:a.tenantId,actorId:a.auditActorId??a.actorId??a.ownerId,action:'contact.exported',entityType:'Profile',entityId:(await owned(db,a)).id,after:{count:page.items.length}}});return{csv:'\uFEFF'+['Data',...keys,'Aceitou novidades','Situação','Página de origem','Primeiro atendimento'].map(csvCell).join(',')+'\r\n'+page.items.map(row=>[row.createdAt.toISOString(),...keys.map(k=>row.answers[k]??''),row.marketingOptIn?'Sim':'Não',({NEW:'Novo',IN_PROGRESS:'Em atendimento',DONE:'Concluído'} as const)[row.status],'/p/'+row.sourceSlug,row.firstHandledAt?.toISOString()??''].map(csvCell).join(',')).join('\r\n'),nextCursor:page.nextCursor}}

export async function previewContactForm(db:PrismaClient,a:ProfileActor){const state=await readContactForm(db,a);return state.definition.enabled&&state.revisionId?{revisionId:state.revisionId,definition:state.definition}:null}
