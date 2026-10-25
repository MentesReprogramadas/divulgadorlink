import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'
import { afterAll, expect, it } from 'vitest'
import { prepareLinkMedia } from '@/domain/links/link-media'
import { mutateLinkMedia, readApprovedLinkMedia } from './link-media'
import { PrismaLinksRepository } from './links-repository'

const url = process.env.ANALYTICS_DATABASE_URL
if (!url || !['localhost','127.0.0.1'].includes(new URL(url).hostname)) throw new Error('Disposable local PG required')
const db = new PrismaClient({ datasources: { db: { url } } })
afterAll(async () => { await db.$disconnect() })
it('keeps pending bytes private, preserves approved replacement, rejects stale decisions and enforces ownership', async () => {
  const tenantId=randomUUID(), ownerId=randomUUID(), linkId=randomUUID(), networkId=randomUUID(), nicheId=randomUUID()
  await db.tenant.create({data:{id:tenantId,host:tenantId+'.test',name:'Media test'}})
  await db.user.create({data:{id:ownerId,tenantId,name:'Owner',passwordHash:'test',identifiers:{create:{tenantId,kind:'EMAIL',normalizedValue:ownerId+'@test.local',confirmedAt:new Date()}}}})
  await db.network.create({data:{id:networkId,tenantId,name:'Site',slug:networkId}})
  await db.niche.create({data:{id:nicheId,tenantId,name:'Tema',slug:nicheId}})
  await db.link.create({data:{id:linkId,tenantId,ownerId,networkId,nicheId,name:'Link',description:'Sobre',canonicalUrl:'https://example.com/'+linkId,status:'PUBLISHED'}})
  const actor={tenantId,ownerId}, media=await prepareLinkMedia('IMAGE',{base64:readFileSync('src/domain/profiles/avatar.fixture.png').toString('base64'),alt:'Foto'})
  try {
    const repository=new PrismaLinksRepository(db), createData={tenantId,ownerId,networkId,nicheId,name:'Novo',description:'Sobre novo',canonicalUrl:'https://example.com/'+randomUUID(),otherNote:null}
    await expect(repository.createWithinQuota({...createData,media:[{kind:'IMAGE',bytes:Buffer.alloc(0),alt:'Foto'}]},()=> 'PUBLISHED')).rejects.toThrow()
    expect(await db.link.count({where:{canonicalUrl:createData.canonicalUrl}})).toBe(0)
    const initial=await repository.createWithinQuota({...createData,media:[media,{...media,kind:'ICON',alt:null}]},()=> 'PUBLISHED')
    expect(await db.linkMediaAsset.count({where:{linkId:initial.id,status:'PENDING'}})).toBe(2)
    expect((await readApprovedLinkMedia(db,tenantId,[initial.id])).size).toBe(0)
    await db.link.delete({where:{id:initial.id}})
    await expect(mutateLinkMedia(db,{tenantId,ownerId:'other'},linkId,0,{type:'PUT',media})).rejects.toMatchObject({status:404})
    await mutateLinkMedia(db,actor,linkId,0,{type:'PUT',media})
    expect((await readApprovedLinkMedia(db,tenantId,[linkId])).get(linkId)).toBeUndefined()
    const pending=await db.linkMediaAsset.findFirstOrThrow({where:{linkId,status:'PENDING'}})
    await db.$executeRawUnsafe(`CREATE FUNCTION media_audit_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."entityId"='${linkId}' AND NEW.action='link.media.approve' THEN RAISE EXCEPTION 'media audit unavailable'; END IF; RETURN NEW; END $$`)
    await db.$executeRawUnsafe('CREATE TRIGGER media_audit_failure_trigger BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION media_audit_failure()')
    try {
      await expect(mutateLinkMedia(db,{...actor,admin:true},linkId,1,{type:'DECIDE',assetId:pending.id,decision:'APPROVE'})).rejects.toThrow('media audit unavailable')
      expect((await db.link.findUniqueOrThrow({where:{id:linkId}})).mediaVersion).toBe(1)
      expect((await db.linkMediaAsset.findUniqueOrThrow({where:{id:pending.id}})).status).toBe('PENDING')
    } finally {await db.$executeRawUnsafe('DROP TRIGGER media_audit_failure_trigger ON audit_logs');await db.$executeRawUnsafe('DROP FUNCTION media_audit_failure()')}
    await mutateLinkMedia(db,{...actor,admin:true},linkId,1,{type:'DECIDE',assetId:pending.id,decision:'APPROVE'})
    const approved=(await readApprovedLinkMedia(db,tenantId,[linkId])).get(linkId)!
    expect(approved.imageUrl).toContain(pending.id)
    await mutateLinkMedia(db,actor,linkId,2,{type:'PUT',media})
    expect((await readApprovedLinkMedia(db,tenantId,[linkId])).get(linkId)).toEqual(approved)
    await expect(mutateLinkMedia(db,{...actor,admin:true},linkId,1,{type:'DECIDE',assetId:pending.id,decision:'APPROVE'})).rejects.toMatchObject({status:409})
    const replacement=await db.linkMediaAsset.findFirstOrThrow({where:{linkId,status:'PENDING'}})
    await mutateLinkMedia(db,{...actor,admin:true},linkId,3,{type:'DECIDE',assetId:replacement.id,decision:'REJECT',reason:'Imagem inadequada'})
    expect((await readApprovedLinkMedia(db,tenantId,[linkId])).get(linkId)).toEqual(approved)
    await mutateLinkMedia(db,actor,linkId,4,{type:'PUT',media})
    const withdrawnPending=await db.linkMediaAsset.findFirstOrThrow({where:{linkId,status:'PENDING'}})
    await db.link.update({where:{id:linkId},data:{status:'UNAVAILABLE'}})
    await db.user.update({where:{id:ownerId},data:{status:'BANNED'}})
    await expect(mutateLinkMedia(db,{...actor,admin:true},linkId,5,{type:'DECIDE',assetId:withdrawnPending.id,decision:'APPROVE'})).rejects.toMatchObject({status:403})
    await mutateLinkMedia(db,{...actor,admin:true},linkId,5,{type:'DECIDE',assetId:withdrawnPending.id,decision:'REJECT',reason:'Link retirado'})
    expect(await db.linkMediaAsset.count({where:{linkId,status:'PENDING'}})).toBe(0)
    expect((await readApprovedLinkMedia(db,tenantId,[linkId])).get(linkId)).toEqual(approved)
    await db.link.update({where:{id:linkId},data:{status:'PUBLISHED'}})
    await db.user.update({where:{id:ownerId},data:{status:'BANNED'}})
    await expect(mutateLinkMedia(db,actor,linkId,6,{type:'REMOVE',kind:'IMAGE'})).rejects.toMatchObject({status:403})
    await db.user.update({where:{id:ownerId},data:{status:'ACTIVE'}})
    await mutateLinkMedia(db,actor,linkId,6,{type:'REMOVE',kind:'IMAGE'})
    expect(await db.linkMediaAsset.count({where:{linkId}})).toBe(0)
    expect(await db.auditLog.count({where:{tenantId,action:'link.media.reject'}})).toBe(2)
    expect((await db.link.findUniqueOrThrow({where:{id:linkId}})).description).toBe('Sobre')
  } finally {
    await db.auditLog.deleteMany({where:{tenantId}}); await db.link.delete({where:{id:linkId}}); await db.network.delete({where:{id:networkId}});await db.niche.delete({where:{id:nicheId}});await db.userIdentifier.deleteMany({where:{userId:ownerId}});await db.user.delete({where:{id:ownerId}});await db.tenant.delete({where:{id:tenantId}})
  }
})
