import {type Prisma,type PrismaClient} from '@prisma/client'
import {ProfileError} from '@/domain/profiles/profile'
import type {ProfileActor} from '@/domain/access/profile-access'
import {nextContactState,type ContactStatus} from '@/domain/leads/contact-handling'
import {assertContactPage} from './contact-forms'
type Tx=Prisma.TransactionClient
type Contact={id:string;tenantId:string;formId:string;status:ContactStatus;version:number;firstHandledAt:Date|null;sourceSlug:string;createdAt:Date;expiresAt:Date;answers:Record<string,string>;marketingOptIn:boolean}
type Note={id:string;text:string;actorId:string;createdAt:Date;updatedAt:Date}
type History={version:number;kind:string;actorId:string;fromStatus:ContactStatus|null;toStatus:ContactStatus|null;noteId:string|null;createdAt:Date}
async function owned(tx:Tx,a:ProfileActor,id:string,write=false){
 await assertContactPage(tx,a,write)
 const rows=await tx.$queryRaw<Contact[]>`SELECT s.* FROM contact_submissions s JOIN contact_forms f ON f.id=s."formId" AND f."tenantId"=s."tenantId" WHERE s.id=${id} AND s."tenantId"=${a.tenantId} AND f."ownerId"=${a.ownerId} AND s."expiresAt">CURRENT_TIMESTAMP FOR UPDATE OF s`
 if(!rows[0])throw new ProfileError(404,'Contato não encontrado.')
 return rows[0]
}
async function history(tx:Tx,a:ProfileActor,id:string,before?:number){
 const rows=await tx.$queryRaw<History[]>`SELECT version,kind,"actorId","fromStatus","toStatus","noteId","createdAt" FROM contact_history WHERE "contactId"=${id} AND "tenantId"=${a.tenantId} AND (${before??null}::int IS NULL OR version<${before??null}::int) ORDER BY version DESC LIMIT 51`
 return{history:rows.slice(0,50),nextHistoryCursor:rows.length>50?rows[49].version:null}
}
async function detail(tx:Tx,a:ProfileActor,row:Contact){
 const notes=await tx.$queryRaw<Note[]>`SELECT id,text,"actorId","createdAt","updatedAt" FROM contact_notes WHERE "contactId"=${row.id} AND "tenantId"=${a.tenantId} ORDER BY "createdAt",id`
 const {id,answers,marketingOptIn,createdAt,expiresAt,status,version,firstHandledAt,sourceSlug}=row
 return{id,answers,marketingOptIn,createdAt,expiresAt,status,version,firstHandledAt,sourceSlug,notes,...await history(tx,a,id)}
}
function expected(row:Contact,version:number){if(row.version!==version)throw new ProfileError(409,'O atendimento mudou em outra aba. Atualize antes de salvar.')}
async function record(tx:Tx,a:ProfileActor,row:Contact,kind:string,extra:{fromStatus?:ContactStatus;toStatus?:ContactStatus;noteId?:string}={}){
 const actor=a.auditActorId??a.actorId??a.ownerId
 await tx.$executeRaw`INSERT INTO contact_history("contactId","tenantId",version,"actorId",kind,"fromStatus","toStatus","noteId") VALUES(${row.id},${a.tenantId},${row.version+1},${actor},${kind},${extra.fromStatus??null},${extra.toStatus??null},${extra.noteId??null})`
 await tx.$executeRaw`UPDATE contact_submissions SET version=version+1 WHERE id=${row.id} AND "tenantId"=${a.tenantId}`
 await tx.auditLog.create({data:{tenantId:a.tenantId,actorId:actor,action:'contact.'+kind,entityType:'ContactSubmission',entityId:row.id,after:{version:row.version+1,...extra}}})
}
export function readContact(db:PrismaClient,a:ProfileActor,id:string){return db.$transaction(async tx=>detail(tx,a,await owned(tx,a,id)))}
export function readContactHistory(db:PrismaClient,a:ProfileActor,id:string,before?:number){return db.$transaction(async tx=>{await owned(tx,a,id);return history(tx,a,id,before)})}
export function changeContactStatus(db:PrismaClient,a:ProfileActor,id:string,input:{status:ContactStatus;expectedVersion:number},now=new Date()){
 return db.$transaction(async tx=>{
  const row=await owned(tx,a,id,true);expected(row,input.expectedVersion)
  if(row.status===input.status)return detail(tx,a,row)
  const next=nextContactState(row,input.status,now)
  await tx.$executeRaw`UPDATE contact_submissions SET status=${next.status},"firstHandledAt"=${next.firstHandledAt} WHERE id=${id} AND "tenantId"=${a.tenantId}`
  await record(tx,a,row,'status.changed',{fromStatus:row.status,toStatus:next.status})
  return detail(tx,a,{...row,...next,version:row.version+1})
 })
}
export function writeContactNote(db:PrismaClient,a:ProfileActor,id:string,input:{id:string;text:string;expectedVersion:number},editing=false){
 return db.$transaction(async tx=>{
  const row=await owned(tx,a,id,true),notes=await tx.$queryRaw<Note[]>`SELECT id,text,"actorId","createdAt","updatedAt" FROM contact_notes WHERE "contactId"=${id} AND "tenantId"=${a.tenantId} ORDER BY "createdAt",id`
  const note=notes.find(note=>note.id===input.id)
  if(!editing&&note){if(note.text===input.text)return detail(tx,a,row);throw new ProfileError(409,'Esta nota já foi salva com outro conteúdo.')}
  expected(row,input.expectedVersion)
  if(editing&&!note)throw new ProfileError(404,'Nota não encontrada.')
  if(editing&&note?.text===input.text)return detail(tx,a,row)
  if(!editing&&notes.length>=50)throw new ProfileError(429,'Use até 50 notas por contato. Edite ou remova uma nota para continuar.')
  if(editing)await tx.$executeRaw`UPDATE contact_notes SET text=${input.text},"updatedAt"=CURRENT_TIMESTAMP WHERE id=${input.id} AND "contactId"=${id} AND "tenantId"=${a.tenantId}`
  else await tx.$executeRaw`INSERT INTO contact_notes(id,"tenantId","contactId","actorId",text) VALUES(${input.id},${a.tenantId},${id},${a.auditActorId??a.actorId??a.ownerId},${input.text})`
  await record(tx,a,row,editing?'note.updated':'note.created',{noteId:input.id})
  return detail(tx,a,{...row,version:row.version+1})
 })
}
export function deleteContactNote(db:PrismaClient,a:ProfileActor,id:string,noteId:string,expectedVersion:number){return db.$transaction(async tx=>{
 const row=await owned(tx,a,id,true);expected(row,expectedVersion)
 const removed=await tx.$executeRaw`DELETE FROM contact_notes WHERE id=${noteId} AND "contactId"=${id} AND "tenantId"=${a.tenantId}`
 if(!removed)throw new ProfileError(404,'Nota não encontrada.')
 await record(tx,a,row,'note.deleted',{noteId});return detail(tx,a,{...row,version:row.version+1})
})}
