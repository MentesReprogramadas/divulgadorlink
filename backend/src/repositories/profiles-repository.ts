import { Prisma, type PrismaClient } from '@prisma/client'
import { ProfileError, visibleProfile, type ProfileContent } from '@/domain/profiles/profile'
import { profileInput } from '@/domain/profiles/profile-input'
import { assertPublicHttps } from '@/adapters/http/safe-fetch'
import { canonicalUrl } from '@/domain/links/canonical-url'
import { canSubmitLinkFromIdentifiers } from '@/use-cases/@Auth/confirm-identifier'
import { validateProfile, type ProfileValidationPorts } from '@/use-cases/@Profiles/validate-profile'
import { PrismaProfileMedia } from './profile-media'

type Actor = { tenantId: string; ownerId: string; age: boolean }
const include = { categories: { orderBy: { position: 'asc' as const } }, items: { orderBy: { position: 'asc' as const } } }
type Stored = Prisma.ProfileGetPayload<{ include: typeof include }>
function draft(row: Stored): ProfileContent {
  return profileInput.parse({ slug: row.slug, name: row.name, bio: row.bio, avatarAssetId: row.avatarAssetId, requiresAge: row.requiresAge, primaryItemId: row.items.some(i => i.id === row.primaryItemId) ? row.primaryItemId : null, categories: row.categories.map(c => ({ id: c.id, name: c.name, visible: c.visible })), items: row.items.map(i => ({ id: i.id, categoryId: i.categoryId, type: i.type, label: i.label, destination: i.destination, visible: i.visible })) })
}
async function owner(db: Prisma.TransactionClient, actor: Actor, publishing = false) {
  const user = await db.user.findFirst({ where: { id: actor.ownerId, tenantId: actor.tenantId }, include: { identifiers: true } })
  if (!user || user.status !== 'ACTIVE' || (publishing && !canSubmitLinkFromIdentifiers(user.status, user.identifiers))) throw new ProfileError(403, 'Esta conta não pode alterar ou publicar o perfil. Confirme seu e-mail e verifique o estado da conta.')
}
async function locked<T>(db: PrismaClient, actor: Actor, work: (tx: Prisma.TransactionClient) => Promise<T>) {
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM users WHERE id=${actor.ownerId} AND "tenantId"=${actor.tenantId} FOR UPDATE`
    await owner(tx, actor)
    return work(tx)
  })
}
async function read(db: Prisma.TransactionClient, actor: Actor) { return db.profile.findUnique({ where: { tenantId_ownerId: { tenantId: actor.tenantId, ownerId: actor.ownerId } }, include }) }
function version(row: Stored | null, expected: number) { if ((row?.version ?? 0) !== expected) throw new ProfileError(409, 'O perfil mudou em outra aba. Recarregue os dados antes de salvar.') }
function response(row: Stored | null) { return { draft: row ? { ...draft(row), version: row.version } : null, publishedVersion: row?.publishedVersion ?? null } }
async function checkAvatar(db: Prisma.TransactionClient, actor: Actor, content: ProfileContent) {
  if (content.avatarAssetId && !await new PrismaProfileMedia(db).get({ tenantId: actor.tenantId, ownerId: actor.ownerId, id: content.avatarAssetId })) throw new ProfileError(422, 'A foto não está disponível para esta conta. Envie a imagem novamente.')
}
async function pruneMedia(db: Prisma.TransactionClient, actor: Actor, keep: string[] = []) {
  const row = await read(db, actor)
  if (row?.avatarAssetId) keep.push(row.avatarAssetId)
  if (row?.publication) { const live = profileInput.parse(row.publication); if (live.avatarAssetId) keep.push(live.avatarAssetId) }
  await db.profileAsset.deleteMany({ where: { tenantId: actor.tenantId, ownerId: actor.ownerId, id: { notIn: keep } } })
}
/** One projection for owner preview and public reads. Live catalog eligibility is never frozen into a snapshot. */
async function projection(db: Prisma.TransactionClient, actor: Actor, content: ProfileContent, publishedRevisionId: number) {
  const refs = content.items.filter(i => i.type === 'CATALOG').map(i => i.destination)
  const links = await db.link.findMany({ where: { tenantId: actor.tenantId, id: { in: refs }, status: 'PUBLISHED', OR: [{ ownerId: null }, { owner: { status: 'ACTIVE', tenantId: actor.tenantId } }] }, include: { niche: true, network: true } })
  const eligible = links.filter(l => l.niche.tenantId === actor.tenantId && l.network.tenantId === actor.tenantId)
  const output = visibleProfile(content, new Set(eligible.map(l => l.id)))
  const adult = output.requiresAge || output.items.some(i => i.type === 'CATALOG' && eligible.some(l => l.id === i.destination && (l.niche.requiresAge || l.network.requiresAge)))
  if (adult && !actor.age) return { restricted: true as const }
  for (const item of output.items) if (item.type !== 'CATALOG') { try { assertPublicHttps(item.destination); item.destination = canonicalUrl(item.destination) } catch { throw new ProfileError(422, 'Corrija os destinos antes de abrir a prévia.') } }
  return { restricted: false as const, ...output, publishedRevisionId }
}
export async function readProfile(db: PrismaClient, actor: Actor) {
  return db.$transaction(async tx => { await owner(tx, actor); return response(await read(tx, actor)) }, { isolationLevel: 'RepeatableRead' })
}
export async function saveProfile(db: PrismaClient, actor: Actor, content: ProfileContent, expectedVersion: number) {
  return locked(db, actor, async tx => {
    const current = await read(tx, actor)
    if (current && JSON.stringify(draft(current)) === JSON.stringify(content)) return response(current)
    version(current, expectedVersion)
    if (current?.publication && current.slug !== content.slug) throw new ProfileError(409, 'Retire o perfil do ar antes de mudar seu endereço.')
    await checkAvatar(tx, actor, content)
    const refs = [...new Set(content.items.filter(i => i.type === 'CATALOG').map(i => i.destination))]
    if (await tx.link.count({ where: { id: { in: refs }, tenantId: actor.tenantId, ownerId: actor.ownerId } }) !== refs.length) throw new ProfileError(404, 'Link do catálogo não encontrado para esta conta.')
    const { categories, items, ...fields } = content
    const row = current ? await tx.profile.update({ where: { id: current.id }, data: { ...fields, version: { increment: 1 } } }) : await tx.profile.create({ data: { ...fields, tenantId: actor.tenantId, ownerId: actor.ownerId, version: 1 } })
    await tx.profileItem.deleteMany({ where: { profileId: row.id } }); await tx.profileCategory.deleteMany({ where: { profileId: row.id } })
    await tx.profileCategory.createMany({ data: categories.map((c, position) => ({ ...c, position, profileId: row.id, tenantId: actor.tenantId, ownerId: actor.ownerId })) })
    await tx.profileItem.createMany({ data: items.map((i, position) => ({ ...i, linkId: i.type === 'CATALOG' ? i.destination : null, position, profileId: row.id, tenantId: actor.tenantId, ownerId: actor.ownerId })) })
    await pruneMedia(tx, actor)
    return response(await read(tx, actor))
  })
}
export async function previewProfile(db: PrismaClient, actor: Actor) {
  return db.$transaction(async tx => { await owner(tx, actor); const row = await read(tx, actor); if (!row) throw new ProfileError(404, 'Salve seu perfil para abrir a prévia.'); return projection(tx, actor, draft(row), row.version) }, { isolationLevel: 'RepeatableRead' })
}
export async function publishProfile(db: PrismaClient, actor: Actor, expectedVersion: number, ports: ProfileValidationPorts) {
  await owner(db, actor, true)
  const row = await read(db, actor); version(row, expectedVersion)
  if (!row) throw new ProfileError(404, 'Salve seu perfil antes de publicar.')
  if (row.publishedVersion === row.version) return { publishedRevisionId: row.version }
  const content = draft(row)
  if (!content.items.some(i => i.visible && content.categories.some(c => c.id === i.categoryId && c.visible))) throw new ProfileError(422, 'Inclua pelo menos um link visível antes de publicar.')
  const validated = await validateProfile(db, actor.tenantId, content, ports)
  return locked(db, actor, async tx => {
    await owner(tx, actor, true)
    const current = await read(tx, actor); version(current, expectedVersion)
    if (!current) throw new ProfileError(404, 'Perfil não encontrado.')
    await checkAvatar(tx, actor, validated)
    const refs = validated.items.filter(i => i.type === 'CATALOG')
    // Owner may only reference their own, already published catalog entries.
    const count = await tx.link.count({ where: { tenantId: actor.tenantId, ownerId: actor.ownerId, status: 'PUBLISHED', id: { in: [...new Set(refs.map(i => i.destination))] }, niche: { tenantId: actor.tenantId }, network: { tenantId: actor.tenantId } } })
    if (count !== new Set(refs.map(i => i.destination)).size) throw new ProfileError(422, 'Escolha links publicados do seu catálogo ou use uma URL própria.')
    const live = visibleProfile(validated, new Set(refs.map(i => i.destination)))
    await tx.profile.update({ where: { id: current.id }, data: { publication: live, publishedVersion: current.version } })
    await pruneMedia(tx, actor)
    return { publishedRevisionId: current.version }
  })
}
export async function unpublishProfile(db: PrismaClient, actor: Actor, expectedVersion: number) {
  return locked(db, actor, async tx => { const row = await read(tx, actor); if (!row) throw new ProfileError(404, 'Perfil não encontrado.'); if (!row.publication) return response(row); version(row, expectedVersion); await tx.profile.update({ where: { id: row.id }, data: { publication: Prisma.DbNull, publishedVersion: null, version: { increment: 1 } } }); await pruneMedia(tx, actor); return response(await read(tx, actor)) })
}
export async function publicProfile(db: PrismaClient, tenantId: string, slug: string, age: boolean) {
  return db.$transaction(async tx => {
    const row = await tx.profile.findUnique({ where: { tenantId_slug: { tenantId, slug } }, include: { owner: true } })
    if (!row?.publication || row.owner.status !== 'ACTIVE' || row.owner.tenantId !== tenantId) throw new ProfileError(404, 'Perfil não encontrado.')
    return projection(tx, { tenantId, ownerId: row.ownerId, age }, profileInput.parse(row.publication), row.publishedVersion!)
  }, { isolationLevel: 'RepeatableRead' })
}
export async function profileAvatar(db: PrismaClient, actor: Actor, id: string, publicSlug?: string) {
  if (publicSlug) {
    const live = await publicProfile(db, actor.tenantId, publicSlug, actor.age)
    if (live.restricted || live.avatarAssetId !== id) throw new ProfileError(404, 'Foto não encontrada.')
    const row = await db.profile.findUniqueOrThrow({ where: { tenantId_slug: { tenantId: actor.tenantId, slug: publicSlug } } })
    actor = { ...actor, ownerId: row.ownerId }
  } else await owner(db, actor)
  const bytes = await new PrismaProfileMedia(db).get({ tenantId: actor.tenantId, ownerId: actor.ownerId, id })
  if (!bytes) throw new ProfileError(404, 'Foto não encontrada.')
  return bytes
}
export async function uploadProfileAvatar(db: PrismaClient, actor: Actor, base64: string) {
  return locked(db, actor, async tx => { const id = await new PrismaProfileMedia(tx).put({ ...actor, base64 }); await pruneMedia(tx, actor, [id]); return { avatarAssetId: id } })
}
