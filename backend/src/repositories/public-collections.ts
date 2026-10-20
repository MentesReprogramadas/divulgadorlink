import {Prisma,type PrismaClient} from '@prisma/client'
import {z} from 'zod'
import {collectionPublicationInput,publicCollectionLink,collectionPublished} from '@/domain/collections/public-collection'
import {FavoritesError} from '@/domain/collections/favorites'
import {canSubmitLinkFromIdentifiers} from '@/use-cases/@Auth/confirm-identifier'
import {decideProposedText} from '@/use-cases/@Links/proposed-text-decision'
import type {PublicContentValidationPorts} from '@/use-cases/public-content-validation-ports'
const snapshot=z.object({title:z.string(),description:z.string(),curator:z.string(),requiresAge:z.boolean(),favoriteIds:z.array(z.string())})
const missing=()=>new FavoritesError(404,'Coleção não encontrada.')
export async function changeCollectionPublication(db:PrismaClient,a:{tenantId:string;userId:string;actorId?:string},id:string,expected:number,input:z.infer<typeof collectionPublicationInput>|null,ports:PublicContentValidationPorts){
 const owned=await db.collection.findFirst({where:{id,tenantId:a.tenantId,userId:a.userId},select:{version:true}});if(!owned)throw missing();if(owned.version!==expected)throw new FavoritesError(409,'A coleção mudou. Atualize antes de publicar.');
 const actor=await db.user.findFirst({where:{id:a.userId,tenantId:a.tenantId},include:{identifiers:true}});if(!actor||actor.status!=='ACTIVE'||input&&!canSubmitLinkFromIdentifiers(actor.status,actor.identifiers))throw new FavoritesError(403,'Confirme seu e-mail para publicar.');
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
