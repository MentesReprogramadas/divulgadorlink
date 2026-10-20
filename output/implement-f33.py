from pathlib import Path
r=Path('C:/VSCODE/divulgadorlinks')
def put(p,s):
 p=r/p;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(s,encoding='utf-8')
put('backend/src/domain/collections/public-collection.ts', '''import {z} from 'zod'
import {profileSlug} from '@/domain/profiles/profile'
export const collectionPublicationInput=z.object({expectedVersion:z.number().int().nonnegative().max(2147483646),title:z.string().trim().min(1).max(80),description:z.string().trim().max(500),curator:z.string().trim().min(1).max(80),slug:z.string().transform(value=>profileSlug(value)),requiresAge:z.boolean()}).strict()
export function publicCollectionLink(row:{status:string;tenantId:string;ownerId:string|null;owner:{status:string;tenantId:string}|null;niche:{tenantId:string};network:{tenantId:string}},tenantId:string){return false}
export function collectionPublished(visibility:string,publication:unknown){return false}
''')
put('backend/src/domain/collections/public-collection.spec.ts', '''import {expect,it} from 'vitest'
import {collectionPublicationInput,publicCollectionLink,collectionPublished} from './public-collection'
const row={status:'PUBLISHED',tenantId:'a',ownerId:'owner',owner:{status:'ACTIVE',tenantId:'a'},niche:{tenantId:'a'},network:{tenantId:'a'}}
it('F33-U01/T03/T05 elegibilidade atual exclui rejeitados, banidos e relações de outro tenant',()=>{expect(publicCollectionLink(row,'a')).toBe(true);for(const value of [{...row,status:'REJECTED'},{...row,owner:{status:'BANNED',tenantId:'a'}},{...row,network:{tenantId:'b'}},{...row,owner:null}])expect(publicCollectionLink(value,'a')).toBe(false)})
it('F33-U02/U04/T01/T04/T06 privado nunca publica nem conserva público ao revogar',()=>{expect(collectionPublished('PRIVATE',{})).toBe(false);expect(collectionPublished('PUBLIC',null)).toBe(false);expect(collectionPublished('PUBLIC',{})).toBe(true)})
it('F33-U03/T02 contrato público exige curador explícito e não transfere dono',()=>{const input={expectedVersion:0,title:'Estudos',description:'Seleção',curator:'Ana',slug:'estudos',requiresAge:false};expect(collectionPublicationInput.parse(input)).toEqual(input);expect(collectionPublicationInput.safeParse({...input,ownerId:'outro'}).success).toBe(false);expect(collectionPublicationInput.safeParse({...input,slug:'admin'}).success).toBe(false)})
''')
p=r/'backend/src/domain/collections/public-collection.ts';s=p.read_text();s=s.replace('return false}',"return row.status==='PUBLISHED'&&row.tenantId===tenantId&&row.niche.tenantId===tenantId&&row.network.tenantId===tenantId&&(!row.ownerId||Boolean(row.owner&&row.owner.status==='ACTIVE'&&row.owner.tenantId===tenantId))}",1).replace('return false}',"return visibility==='PUBLIC'&&publication!==null}");s=s.replace('z.string().transform(value=>profileSlug(value))',"z.string().transform((value,ctx)=>{try{return profileSlug(value)}catch{ctx.addIssue({code:'custom',message:'Endereço inválido ou reservado.'});return z.NEVER}})");p.write_text(s,encoding='utf-8')
p=r/'backend/prisma/schema.prisma';s=p.read_text();s=s.replace('model Collection {','''model CollectionSlug {
 tenantId String
 slug String
 publicationKey String
 @@id([tenantId, slug])
 @@map("collection_slugs")
}
model Collection {''').replace('model Collection {\n','''model Collection {
  publicationKey String @default(uuid())
  visibility String @default("PRIVATE")
  slug String?
  publication Json?
  publishedRevision Int?
''');p.write_text(s,encoding='utf-8')
put('backend/prisma/migrations/20261020100000_public_collections/migration.sql','''ALTER TABLE collections ADD COLUMN "publicationKey" TEXT NOT NULL DEFAULT gen_random_uuid()::text, ADD COLUMN visibility TEXT NOT NULL DEFAULT 'PRIVATE', ADD COLUMN slug TEXT, ADD COLUMN publication JSONB, ADD COLUMN "publishedRevision" INTEGER;
ALTER TABLE collections ADD CONSTRAINT collections_publication_check CHECK (visibility IN ('PRIVATE','PUBLIC') AND (visibility='PRIVATE' OR (publication IS NOT NULL AND slug IS NOT NULL AND "publishedRevision" IS NOT NULL)));
CREATE UNIQUE INDEX collections_public_slug_key ON collections("tenantId",slug);
CREATE TABLE collection_slugs ("tenantId" TEXT NOT NULL,slug TEXT NOT NULL,"publicationKey" TEXT NOT NULL,PRIMARY KEY("tenantId",slug));
''')
# Private contracts keep existing fields, add public state only on detail.
p=r/'backend/src/repositories/favorites-repository.ts';s=p.read_text();s=s.replace("select: { id: true, name: true, version: true } })\n    if (!collection)","select: { id: true, name: true, version: true, visibility:true, slug:true, publication:true, publishedRevision:true } })\n    if (!collection)");p.write_text(s,encoding='utf-8')
put('backend/src/repositories/public-collections.ts','''import {Prisma,type PrismaClient} from '@prisma/client'
import {z} from 'zod'
import {collectionPublicationInput,publicCollectionLink,collectionPublished} from '@/domain/collections/public-collection'
import {FavoritesError} from '@/domain/collections/favorites'
import {canSubmitLinkFromIdentifiers} from '@/use-cases/@Auth/confirm-identifier'
import {decideProposedText} from '@/use-cases/@Links/proposed-text-decision'
import type {PublicContentValidationPorts} from '@/use-cases/public-content-validation-ports'
const snapshot=z.object({title:z.string(),description:z.string(),curator:z.string(),requiresAge:z.boolean(),favoriteIds:z.array(z.string())})
const missing=()=>new FavoritesError(404,'Coleção não encontrada.')
export async function changeCollectionPublication(db:PrismaClient,a:{tenantId:string;userId:string;actorId?:string},id:string,expected:number,input:z.infer<typeof collectionPublicationInput>|null,ports:PublicContentValidationPorts){
 // Validate external text before locking; recheck the version and actor inside the transaction.
 if(input){const [terms,threshold]=await Promise.all([db.blocklistTerm.findMany({where:{tenantId:a.tenantId}}),db.config.findUnique({where:{tenantId_key:{tenantId:a.tenantId,key:'MODERATION_AUTO_APPROVE_THRESHOLD'}}})]);const text=[input.title,input.description,input.curator].join(' '),limit=Number(threshold?.value);let approved=false;
 if(threshold&&Number.isFinite(limit)&&limit>=0&&limit<=1&&!terms.some(t=>text.toLocaleLowerCase().includes(t.term.toLocaleLowerCase()))){try{const verdict=await ports.judge({name:input.title,description:text,niche:'Curadoria pública de links já moderados'});approved=decideProposedText({publishedName:'',proposedName:input.title,blocklisted:false,threshold:limit,verdict}).decision==='PUBLISH'}catch{/* Fail closed; retain editor values. */}}
 if(!approved)throw new FavoritesError(400,'Não foi possível liberar o texto da coleção. Revise título, descrição e nome do curador antes de tentar novamente.')}
 return db.$transaction(async tx=>{
 await tx.$queryRaw`SELECT id FROM users WHERE id=${a.userId} AND "tenantId"=${a.tenantId} FOR UPDATE`;
 const user=await tx.user.findFirst({where:{id:a.userId,tenantId:a.tenantId},include:{identifiers:true}});if(!user||user.status!=='ACTIVE'||input&&!canSubmitLinkFromIdentifiers(user.status,user.identifiers))throw new FavoritesError(403,'Confirme seu e-mail para publicar.');
 const row=await tx.collection.findFirst({where:{id,tenantId:a.tenantId,userId:a.userId}});if(!row)throw missing();if(row.version!==expected)throw new FavoritesError(409,'A coleção mudou. Atualize antes de publicar.');
 if(input){if(row.slug&&row.slug!==input.slug)throw new FavoritesError(409,'O endereço publicado é permanente. Use o mesmo endereço.');const reserved=await tx.collectionSlug.findUnique({where:{tenantId_slug:{tenantId:a.tenantId,slug:input.slug}}});if(reserved&&reserved.publicationKey!==row.publicationKey)throw new FavoritesError(409,'Esse endereço já está reservado. Escolha outro.');
 const items=await tx.collectionItem.findMany({where:{collectionId:id,tenantId:a.tenantId,userId:a.userId},orderBy:{position:'asc'},select:{favoriteId:true,favorite:{include:{link:{include:{niche:true,network:true,owner:{select:{status:true,tenantId:true}}}}}}}});
 const eligible=items.filter(i=>publicCollectionLink(i.favorite.link,a.tenantId));if(!eligible.length)throw new FavoritesError(400,'Adicione ao menos um link aprovado e disponível antes de publicar.');
 if(!reserved)await tx.collectionSlug.create({data:{tenantId:a.tenantId,slug:input.slug,publicationKey:row.publicationKey}});
 await tx.collection.update({where:{id},data:{visibility:'PUBLIC',slug:input.slug,publication:{title:input.title,description:input.description,curator:input.curator,requiresAge:input.requiresAge,favoriteIds:eligible.map(i=>i.favoriteId)},publishedRevision:(row.publishedRevision??0)+1,version:{increment:1}}});
 }else await tx.collection.update({where:{id},data:{visibility:'PRIVATE',version:{increment:1}}});
 await tx.auditLog.create({data:{tenantId:a.tenantId,actorId:a.actorId??a.userId,action:input?'collection.published':'collection.unpublished',entityType:'Collection',entityId:id}});
 return {saved:true}
 })
}
export async function publicCollection(db:PrismaClient,tenantId:string,slug:string,age:boolean){
 return db.$transaction(async tx=>{
 const row=await tx.collection.findFirst({where:{tenantId,slug,user:{status:'ACTIVE'}}});if(!row||!collectionPublished(row.visibility,row.publication))throw missing();const content=snapshot.parse(row.publication);
 const entries=await tx.collectionItem.findMany({where:{collectionId:row.id,tenantId,userId:row.userId,favoriteId:{in:content.favoriteIds}},include:{favorite:{include:{link:{include:{niche:true,network:true,owner:{select:{status:true,tenantId:true}}}}}}}});
 const ordered=new Map(entries.map(i=>[i.favoriteId,i.favorite.link]));const eligible=content.favoriteIds.flatMap(id=>{const link=ordered.get(id);return link&&publicCollectionLink(link,tenantId)?[link]:[]});
 if(!age&&(content.requiresAge||eligible.some(l=>l.niche.requiresAge||l.network.requiresAge)))return {restricted:true as const};
 return {restricted:false as const,title:content.title,description:content.description,curator:content.curator,slug:row.slug!,publishedRevision:row.publishedRevision!,items:eligible.map(l=>({id:l.id,name:l.name,description:l.description,href:'/link/'+encodeURIComponent(l.id),niche:{name:l.niche.name,slug:l.niche.slug},network:{name:l.network.name,slug:l.network.slug},publisher:l.ownerId===row.userId?'Publicado pelo curador':l.ownerId?'Publicado por outro anunciante':'Publicado pela plataforma'}))}
 },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead})
}
''')
# New responsibility uses existing controller run/error conventions.
p=r/'backend/src/http/controllers/@Collections/routes.ts';s=p.read_text();s="import {changeCollectionPublication,publicCollection} from '@/repositories/public-collections'\nimport {collectionPublicationInput} from '@/domain/collections/public-collection'\nimport {publicContentValidationPorts,type PublicContentValidationPorts} from '@/use-cases/public-content-validation-ports'\n"+s;s=s.replace('let testDb: PrismaClient | null = null','let testDb: PrismaClient | null = null, testPorts:PublicContentValidationPorts|null=null\nexport function setCollectionsPortsForTest(ports:PublicContentValidationPorts|null){if(process.env.NODE_ENV===\'test\')testPorts=ports}');s=s.replace('operation: () => Operation)', 'operation: () => Operation, publication?: {id:string;expected:number;input: z.infer<typeof collectionPublicationInput>|null})');s=s.replace('try { return await favoritesOperation','try { if(publication)return await changeCollectionPublication(testDb??prisma,{tenantId:tenant.id,userId:user.sub,actorId:request.workspaceActor?.id},publication.id,publication.expected,publication.input,testPorts??publicContentValidationPorts(normalizeTenantHost(request.headers.host??\'\'))); return await favoritesOperation');marker='export async function favoritesRoutes(app: FastifyInstance) {';s=s.replace(marker,marker+'''
  app.post('/me/collections/:id/publish',(q,r)=>{const input=collectionPublicationInput.parse(q.body);return run(q,r,()=>({kind:'list-collections'}),{id:z.object({id}).parse(q.params).id,expected:input.expectedVersion,input})})
  app.patch('/me/collections/:id/visibility',(q,r)=>{const input=z.object({expectedVersion:version,visibility:z.literal('PRIVATE')}).strict().parse(q.body);return run(q,r,()=>({kind:'list-collections'}),{id:z.object({id}).parse(q.params).id,expected:input.expectedVersion,input:null})})
  app.get('/collections/:slug',async(q,r)=>{r.header('cache-control','private, no-store');const tenant=await resolveTenant(normalizeTenantHost(q.headers.host??''));try{return await publicCollection(testDb??prisma,tenant.id,z.object({slug:z.string().regex(/^[a-z0-9-]{3,40}$/)}).parse(q.params).slug,q.cookies.age==='yes')}catch(error){if(error instanceof FavoritesError)return r.code(error.status).send(buildError({code:'not_found',message:error.message,request_id:q.id}));throw error}})
''');p.write_text(s,encoding='utf-8')
p=r/'backend/src/http/workspace-access.ts';s=p.read_text().replace('profiles\\/|r\\/', 'profiles\\/|collections\\/|r\\/');p.write_text(s,encoding='utf-8')
p=r/'backend/package.json';s=p.read_text().replace('src/http/profile-events.pg.spec.ts"','src/http/profile-events.pg.spec.ts src/http/public-collections.pg.spec.ts"');p.write_text(s,encoding='utf-8')
