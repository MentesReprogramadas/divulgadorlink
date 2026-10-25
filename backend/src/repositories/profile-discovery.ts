import { Prisma, type PrismaClient } from '@prisma/client'
import type { z } from 'zod'
import { ProfileError } from '@/domain/profiles/profile'
import { discoverable, type discoveryInput, type discoveryQuery } from '@/domain/profiles/profile-discovery'
import type { ProfileActor } from '@/domain/access/profile-access'
import { assertProfileOwner, publicProfileProjection } from './profiles-repository'

type Settings = { enabled: boolean; nicheId: string | null; version: number }
export async function readDiscovery(db: PrismaClient, actor: ProfileActor) {
  await assertProfileOwner(db, actor)
  const [settings, niches] = await Promise.all([
    db.$queryRaw<Settings[]>`SELECT d.enabled,d."nicheId",d.version FROM profile_discovery d WHERE d."tenantId"=${actor.tenantId} AND d."ownerId"=${actor.ownerId}`,
    db.niche.findMany({ where: { tenantId: actor.tenantId, isPublicFacet: true }, select: { id: true, name: true, slug: true }, orderBy: { name: 'asc' } }),
  ])
  return { ...(settings[0] ?? { enabled: false, nicheId: null, version: 0 }), niches }
}
export async function saveDiscovery(db: PrismaClient, actor: ProfileActor, input: z.infer<typeof discoveryInput>) {
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM users WHERE id=${actor.ownerId} AND "tenantId"=${actor.tenantId} FOR UPDATE`
    await assertProfileOwner(tx, { ...actor, permission: 'EDIT' })
    const profile = await tx.profile.findUnique({ where: { tenantId_ownerId: { tenantId: actor.tenantId, ownerId: actor.ownerId } } })
    if (!profile) throw new ProfileError(409, 'Crie sua página antes de ativar a descoberta.')
    const current = await tx.$queryRaw<Array<{version:number}>>`SELECT version FROM profile_discovery WHERE "profileId"=${profile.id}`
    if ((current[0]?.version ?? 0) !== input.expectedVersion) throw new ProfileError(409, 'A descoberta mudou em outra aba. Atualize antes de salvar.')
    if (input.nicheId && !await tx.niche.findFirst({ where: { id: input.nicheId, tenantId: actor.tenantId, isPublicFacet: true } })) throw new ProfileError(400, 'Escolha um nicho disponível.')
    await tx.$executeRaw`INSERT INTO profile_discovery ("profileId","tenantId","ownerId",enabled,"nicheId") VALUES (${profile.id},${actor.tenantId},${actor.ownerId},${input.enabled},${input.nicheId}) ON CONFLICT ("profileId") DO UPDATE SET enabled=EXCLUDED.enabled,"nicheId"=EXCLUDED."nicheId",version=profile_discovery.version+1`
    await tx.auditLog.create({ data: { tenantId: actor.tenantId, actorId: actor.auditActorId ?? actor.actorId ?? actor.ownerId, action: 'profile.discovery.changed', entityType: 'Profile', entityId: profile.id, after: input } })
    return { saved: true }
  })
}
type Candidate = { id: string; slug: string; ownerId: string; nicheId: string | null; nicheName: string | null; nicheAge: boolean; following: boolean; eligible: boolean }
export async function listDiscoveredProfiles(db: PrismaClient, actor: ProfileActor, input: z.infer<typeof discoveryQuery>) {
  if (input.followed && !actor.ownerId) throw new ProfileError(401, 'Entre para ver as páginas que segue.')
  return db.$transaction(async tx => {
    if (input.followed) await assertProfileOwner(tx, actor)
    const eligibility=Prisma.sql`d.enabled AND p.publication IS NOT NULL AND p.publication<>'null'::jsonb AND p."publishedVersion" IS NOT NULL AND u.status='ACTIVE' AND (d."nicheId" IS NULL OR n."isPublicFacet")`
    const rows = await tx.$queryRaw<Candidate[]>(Prisma.sql`
      SELECT p.id,p.slug,p."ownerId",d."nicheId",n.name AS "nicheName",COALESCE(n."requiresAge",false) AS "nicheAge",(f."userId" IS NOT NULL) AS following,COALESCE((${eligibility}),false) AS eligible
      FROM profiles p LEFT JOIN profile_discovery d ON d."profileId"=p.id AND d."tenantId"=p."tenantId"
      JOIN users u ON u.id=p."ownerId" AND u."tenantId"=p."tenantId"
      LEFT JOIN niches n ON n.id=d."nicheId" AND n."tenantId"=p."tenantId"
      LEFT JOIN profile_follows f ON f."profileId"=p.id AND f."tenantId"=p."tenantId" AND f."userId"=${actor.ownerId}
      WHERE p."tenantId"=${actor.tenantId} AND ${input.followed ? Prisma.sql`f."userId" IS NOT NULL` : eligibility}
      ${input.nicheId ? Prisma.sql`AND d."nicheId"=${input.nicheId}` : Prisma.empty}
      ${input.cursor ? Prisma.sql`AND p.id>${input.cursor}` : Prisma.empty}
      ${input.followed ? Prisma.sql`AND f."userId" IS NOT NULL` : Prisma.empty}
      ${input.q ? Prisma.sql`AND (strpos(lower(p.publication->>'name'),lower(${input.q}))>0 OR strpos(lower(p.publication->>'bio'),lower(${input.q}))>0)` : Prisma.empty}
      ORDER BY p.id LIMIT 21`)
    const profiles = []
    for (const row of rows.slice(0, 20)) {
      const unavailable=()=>({id:row.id,slug:null,name:'Página indisponível',bio:'Você pode deixar de seguir esta página.',avatarUrl:null,niche:null,sponsored:false,following:true,available:false})
      if (!row.eligible || row.nicheAge && !actor.age) { if(input.followed)profiles.push(unavailable());continue }
      let live
      try { live = await publicProfileProjection(tx, actor.tenantId, row.slug, actor.age) }
      catch(error){if(error instanceof ProfileError&&[404,422].includes(error.status)){if(input.followed)profiles.push(unavailable());continue}throw error}
      if (!discoverable({ enabled: true, published: true, active: true, restricted: live.restricted, items: live.restricted ? 0 : live.items.length })) { if(input.followed)profiles.push(unavailable());continue }
      if (live.restricted) continue
      profiles.push({ id: row.id, slug: live.slug, name: live.name, bio: live.bio, avatarUrl: live.avatarAssetId ? '/bff/v1/profiles/' + encodeURIComponent(live.slug) + '/avatar/' + live.avatarAssetId : null, niche: row.nicheId ? { id: row.nicheId, name: row.nicheName! } : null, sponsored: false, following: row.following, available:true })
    }
    const niches = await tx.niche.findMany({ where: { tenantId: actor.tenantId, isPublicFacet: true, ...(actor.age ? {} : { requiresAge: false }) }, select: { id: true, name: true, slug: true }, orderBy: { name: 'asc' } })
    return { profiles, niches, nextCursor: rows.length > 20 ? rows[19].id : null }
  }, { isolationLevel: 'RepeatableRead' })
}
export async function followProfile(db: PrismaClient, actor: ProfileActor, id: string, following: boolean) {
  return db.$transaction(async tx => {
    // Serialize eligibility and opt-out with follows; never resurrect a removed target.
    await tx.$queryRaw`SELECT id FROM users WHERE id=${actor.ownerId} AND "tenantId"=${actor.tenantId} FOR UPDATE`
    await assertProfileOwner(tx, actor)
    if (!following) {
      await tx.$executeRaw`DELETE FROM profile_follows WHERE "tenantId"=${actor.tenantId} AND "userId"=${actor.ownerId} AND "profileId"=${id}`
      return { following: false }
    }
    const targets = await tx.$queryRaw<Array<{ slug: string; ownerId: string; nicheAge: boolean }>>`SELECT p.slug,p."ownerId",COALESCE(n."requiresAge",false) AS "nicheAge" FROM profiles p JOIN profile_discovery d ON d."profileId"=p.id AND d."tenantId"=p."tenantId" LEFT JOIN niches n ON n.id=d."nicheId" AND n."tenantId"=p."tenantId" WHERE p.id=${id} AND p."tenantId"=${actor.tenantId} AND d.enabled AND (d."nicheId" IS NULL OR n."isPublicFacet") FOR UPDATE OF d`
    const target = targets[0]
    if (!target || target.nicheAge && !actor.age) throw new ProfileError(404, 'Página indisponível para seguir.')
    const live = await publicProfileProjection(tx, actor.tenantId, target.slug, actor.age)
    if (live.restricted || !live.items.length) throw new ProfileError(404, 'Página indisponível para seguir.')
    await tx.$executeRaw`INSERT INTO profile_follows ("tenantId","userId","profileId","profileOwnerId") VALUES (${actor.tenantId},${actor.ownerId},${id},${target.ownerId}) ON CONFLICT DO NOTHING`
    return { following: true }
  })
}
