# SEO de marca e tema — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A home disputa a marca, e nicho, rede e link só entram na busca quando passam na régua de substância, com resumo opcional editável no admin.

**Architecture:** `index-policy` é a única função que decide texto substantivo, faceta indexável e `robots`. O sitemap e o SEO público chamam essa função. `summary` mora em `Niche` e `Network`. O admin grava o campo. O HTML usa o `seo` da API para o `<title>` e um `heading` separado para o H1.

**Tech Stack:** Fastify, Prisma, Vitest, Next.js 15 App Router, Testing Library.

## Global Constraints

- `MIN_LINKS = 3`, `MIN_TEXT = 80`, `MAX_SUMMARY = 500`.
- Link substantivo: `PUBLISHED`, dono não `BANNED`, nicho sem 18+, descrição aparada com pelo menos 80 caracteres e diferente do nome aparado.
- Faceta pública entra se não exige idade e (tem pelo menos 3 links substantivos nela ou `summary` aparado com pelo menos 80 caracteres).
- Link entra só se é substantivo e o nicho dele entrou. A contagem não espera a faceta já estar indexável.
- Link de nicho 18+ não conta para a rede.
- Página pública fina: `noindex,follow`, HTTP 200. 18+, faceta não pública, indisponível e banido: `noindex,nofollow`.
- Home entra sempre. Query `network`, `niche` ou `cursor` na faceta: `noindex,follow`, canonical sem query.
- H1 da home: `Encontre o que você procura.` `<title>` da home: nome do tenant. Description: `Links, comunidades e serviços organizados por tema e rede.`
- H1 de nicho e rede: nome da faceta. `<title>`: `{nome} | {tenant}`.
- Frase automática do nicho: `Links de {nome} organizados por rede.` Da rede: `Links publicados em {nome}.`
- Resumo existente vira parágrafo e meta description. Não é descartado por parecer com o título.
- Trilha visível: faceta `Início / {nome}`; link `Início / {nicho} / {nome}`.
- JSON-LD só em página indexável, e inclui a trilha. `CollectionPage` sem links indexáveis sai sem lista. Item em `/link/{id}`, sem `surfaceToken`.
- `summary` vazio vira `null`. Acima de 500 ou com `<` responde 400 e não grava.
- 18+ pode guardar e mostrar resumo. A régua ignora esse texto.
- Admin em Configurações, sem rota nova. `GET /api/v1/admin/facets` devolve `indexable` calculado pela mesma função. `PATCH /api/v1/admin/facets/:kind/:id`.
- Não-admin recebe 403. Admin de outro tenant recebe 404. Isso não copia o status de `requireAdmin` em `settings.ts`, que faz o inverso.
- Auditoria `facet.summary.update` com antes e depois.
- Search Console, redação dos resumos e mudança da regra de 18+ ficam fora.

---

## File structure

- Create: `backend/src/domain/catalog/index-policy.ts` — régua pura. Sem Prisma e sem HTTP.
- Create: `backend/src/domain/catalog/index-policy.spec.ts` — testes da régua.
- Create: `backend/prisma/migrations/20261006120000_facet_summary/migration.sql` — colunas `summary`.
- Modify: `backend/prisma/schema.prisma` — `summary String?` em `Niche` e `Network`.
- Modify: `backend/src/repositories/links-repository.ts` — `summary`, contagem e update.
- Modify: `backend/src/http/sitemap-index.ts` — sitemap usa a régua.
- Modify: `backend/src/http/controllers/@Catalog/routes.ts` — SEO de faceta e `indexable` nos cards.
- Modify: `backend/src/http/controllers/@Links/routes.ts` — SEO do link.
- Modify: `backend/src/http/catalog.http.spec.ts` — expectativas antigas que passam a ser finas.
- Create: `backend/src/http/controllers/@Admin/facets.ts` — GET e PATCH.
- Create: `backend/src/http/controllers/@Admin/facets.spec.ts` — contrato admin.
- Modify: `backend/src/http/controllers/@Admin/routes.ts` — registra as rotas.
- Create: `frontend/src/components/domain/breadcrumb.tsx` — trilha visível.
- Modify: `frontend/src/components/domain/facet-catalog.tsx` — H1 é `heading`, trilha, JSON-LD só se indexável.
- Modify: `frontend/src/app/nicho/[slug]/page.tsx` e `frontend/src/app/rede/[slug]/page.tsx` — passam `heading`.
- Modify: `frontend/src/app/link/[id]/page.tsx` — trilha de três níveis. H1 continua o nome.
- Modify: `frontend/src/app/page.tsx` — ItemList só com cards `indexable`.
- Modify: `frontend/src/domain/crawler-policy.test.ts` — `noindex,follow` não vira `follow: false`.
- Modify: `frontend/src/components/domain/facet-catalog.test.tsx` — H1, trilha, resumo.
- Create: `frontend/src/app/admin/configuracoes/facet-summaries.tsx` — listas e salvar.
- Modify: `frontend/src/app/admin/configuracoes/page.tsx` — seção abaixo do interruptor.
- Create: `frontend/src/app/admin/configuracoes/facet-summaries.test.tsx`.

---

### Task 1: Régua pura

**Files:**
- Create: `backend/src/domain/catalog/index-policy.ts`
- Test: `backend/src/domain/catalog/index-policy.spec.ts`

**Interfaces:**
- Consumes: nada
- Produces:
  - `MIN_LINKS`, `MIN_TEXT`, `MAX_SUMMARY`
  - `substantiveText(name: string, description: string): boolean`
  - `cleanSummary(summary: string | null | undefined): string | null`
  - `parseSummary(value: string | null): { ok: true; summary: string | null } | { ok: false }`
  - `facetIndexable(input: { isPublicFacet: boolean; requiresAge: boolean; summary: string | null; substantiveCount: number }): boolean`
  - `facetRobots(input: { isPublicFacet: boolean; requiresAge: boolean; summary: string | null; substantiveCount: number; filtered: boolean }): 'index,follow' | 'noindex,follow' | 'noindex,nofollow'`
  - `linkRobots(input: { substantive: boolean; nicheIndexable: boolean; blocked: boolean }): 'index,follow' | 'noindex,follow' | 'noindex,nofollow'`
  - `documentTitle(kind: 'home' | 'named', name: string, tenant: string): string`
  - `facetBlurb(kind: 'niche' | 'network', name: string, summary: string | null): string`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import {
  cleanSummary,
  documentTitle,
  facetBlurb,
  facetIndexable,
  facetRobots,
  linkRobots,
  parseSummary,
  substantiveText,
} from '@/domain/catalog/index-policy'

const fat = 'a'.repeat(80)

describe('régua de índice', () => {
  it('exige 80 caracteres diferentes do nome', () => {
    expect(substantiveText('Jogos', 'a'.repeat(79))).toBe(false)
    expect(substantiveText('Jogos', fat)).toBe(true)
    expect(substantiveText(fat, `  ${fat}  `)).toBe(false)
  })

  it('faceta entra com 3 links ou com resumo de 80', () => {
    const base = { isPublicFacet: true, requiresAge: false, summary: null, substantiveCount: 2 }
    expect(facetIndexable(base)).toBe(false)
    expect(facetIndexable({ ...base, substantiveCount: 3 })).toBe(true)
    expect(facetIndexable({ ...base, substantiveCount: 0, summary: fat })).toBe(true)
    expect(facetIndexable({ ...base, substantiveCount: 9, summary: fat, requiresAge: true })).toBe(false)
    expect(facetIndexable({ ...base, substantiveCount: 9, isPublicFacet: false })).toBe(false)
  })

  it('separa fino, filtrado e bloqueado', () => {
    const open = { isPublicFacet: true, requiresAge: false, summary: null, substantiveCount: 3, filtered: false }
    expect(facetRobots(open)).toBe('index,follow')
    expect(facetRobots({ ...open, substantiveCount: 2 })).toBe('noindex,follow')
    expect(facetRobots({ ...open, filtered: true })).toBe('noindex,follow')
    expect(facetRobots({ ...open, requiresAge: true })).toBe('noindex,nofollow')
  })

  it('link só entra com nicho indexável e texto substantivo', () => {
    expect(linkRobots({ substantive: true, nicheIndexable: true, blocked: false })).toBe('index,follow')
    expect(linkRobots({ substantive: false, nicheIndexable: true, blocked: false })).toBe('noindex,follow')
    expect(linkRobots({ substantive: true, nicheIndexable: false, blocked: false })).toBe('noindex,follow')
    expect(linkRobots({ substantive: true, nicheIndexable: true, blocked: true })).toBe('noindex,nofollow')
  })

  it('título, resumo e frase automática', () => {
    expect(documentTitle('home', 'Tem Link Aqui', 'Tem Link Aqui')).toBe('Tem Link Aqui')
    expect(documentTitle('named', 'Jogos', 'Tem Link Aqui')).toBe('Jogos | Tem Link Aqui')
    expect(facetBlurb('niche', 'Jogos', null)).toBe('Links de Jogos organizados por rede.')
    expect(facetBlurb('network', 'Telegram', null)).toBe('Links publicados em Telegram.')
    expect(facetBlurb('niche', 'Jogos', '  texto único  ')).toBe('texto único')
    expect(cleanSummary('   ')).toBeNull()
    expect(parseSummary(null)).toEqual({ ok: true, summary: null })
    expect(parseSummary('  ')).toEqual({ ok: true, summary: null })
    expect(parseSummary('a'.repeat(501)).ok).toBe(false)
    expect(parseSummary('oi <b>').ok).toBe(false)
    expect(parseSummary(fat)).toEqual({ ok: true, summary: fat })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/catalog/index-policy.spec.ts`

Expected: FAIL, cannot find module `@/domain/catalog/index-policy`.

- [ ] **Step 3: Write minimal implementation**

```ts
export const MIN_LINKS = 3
export const MIN_TEXT = 80
export const MAX_SUMMARY = 500

export type Robots = 'index,follow' | 'noindex,follow' | 'noindex,nofollow'

export function substantiveText(name: string, description: string): boolean {
  const text = description.trim()
  return text.length >= MIN_TEXT && text !== name.trim()
}

export function cleanSummary(summary: string | null | undefined): string | null {
  const text = summary?.trim() ?? ''
  return text ? text : null
}

export function parseSummary(value: string | null): { ok: true; summary: string | null } | { ok: false } {
  if (value === null) return { ok: true, summary: null }
  const text = value.trim()
  if (!text) return { ok: true, summary: null }
  if (text.length > MAX_SUMMARY || text.includes('<')) return { ok: false }
  return { ok: true, summary: text }
}

export function facetIndexable(input: {
  isPublicFacet: boolean
  requiresAge: boolean
  summary: string | null
  substantiveCount: number
}): boolean {
  if (!input.isPublicFacet || input.requiresAge) return false
  const summary = cleanSummary(input.summary)
  if (summary && summary.length >= MIN_TEXT) return true
  return input.substantiveCount >= MIN_LINKS
}

export function facetRobots(input: {
  isPublicFacet: boolean
  requiresAge: boolean
  summary: string | null
  substantiveCount: number
  filtered: boolean
}): Robots {
  if (!input.isPublicFacet || input.requiresAge) return 'noindex,nofollow'
  if (input.filtered || !facetIndexable(input)) return 'noindex,follow'
  return 'index,follow'
}

export function linkRobots(input: {
  substantive: boolean
  nicheIndexable: boolean
  blocked: boolean
}): Robots {
  if (input.blocked) return 'noindex,nofollow'
  if (input.substantive && input.nicheIndexable) return 'index,follow'
  return 'noindex,follow'
}

export function documentTitle(kind: 'home' | 'named', name: string, tenant: string): string {
  if (kind === 'home') return tenant
  return `${name} | ${tenant}`
}

export function facetBlurb(kind: 'niche' | 'network', name: string, summary: string | null): string {
  return cleanSummary(summary)
    ?? (kind === 'niche'
      ? `Links de ${name} organizados por rede.`
      : `Links publicados em ${name}.`)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/catalog/index-policy.spec.ts`

Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add backend/src/domain/catalog/index-policy.ts backend/src/domain/catalog/index-policy.spec.ts
git commit -m "test: define the catalog index gate"
```

---

### Task 2: Coluna summary e contagem

**Files:**
- Create: `backend/prisma/migrations/20261006120000_facet_summary/migration.sql`
- Modify: `backend/prisma/schema.prisma` (`Niche`, `Network`)
- Modify: `backend/src/repositories/links-repository.ts`
- Test: `backend/src/repositories/links-repository.summary.spec.ts`

**Interfaces:**
- Consumes: `cleanSummary` da Task 1, só na borda HTTP. O repositório guarda a string já validada.
- Produces:
  - `NicheRecord.summary: string | null`
  - `NetworkRecord.summary: string | null`
  - `LinksRepository.substantiveCounts(tenantId: string): Promise<{ niches: Array<{ id: string; count: number }>; networks: Array<{ id: string; count: number }> }>`
  - `LinksRepository.updateFacetSummary(input: { kind: 'niche' | 'network'; id: string; tenantId: string; summary: string | null }): Promise<NicheRecord | NetworkRecord | null>`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { InMemoryLinksRepository, resetLinksRepositoryForTest, getLinksRepository } from '@/repositories/links-repository'

describe('resumo e contagem da faceta', () => {
  it('conta só link substantivo e ignora 18+, banido e texto curto', async () => {
    resetLinksRepositoryForTest()
    const repo = getLinksRepository() as InMemoryLinksRepository
    const fat = 'b'.repeat(80)
    repo.addUser({ id: 'ana', tenantId: 'seed-temlinkaqui', status: 'ACTIVE', identifiers: [] })
    repo.addUser({ id: 'ban', tenantId: 'seed-temlinkaqui', status: 'BANNED', identifiers: [] })
    repo.addLink({ tenantId: 'seed-temlinkaqui', ownerId: 'ana', status: 'PUBLISHED', name: 'Um', description: fat, nicheId: 'niche-jogos', networkId: 'net-telegram' })
    repo.addLink({ tenantId: 'seed-temlinkaqui', ownerId: 'ana', status: 'PUBLISHED', name: 'Dois', description: fat, nicheId: 'niche-jogos', networkId: 'net-telegram' })
    repo.addLink({ tenantId: 'seed-temlinkaqui', ownerId: 'ana', status: 'PUBLISHED', name: 'Curto', description: 'x', nicheId: 'niche-jogos', networkId: 'net-telegram' })
    repo.addLink({ tenantId: 'seed-temlinkaqui', ownerId: 'ban', status: 'PUBLISHED', name: 'Ban', description: fat, nicheId: 'niche-jogos', networkId: 'net-telegram' })
    repo.addLink({ tenantId: 'seed-temlinkaqui', ownerId: 'ana', status: 'PUBLISHED', name: 'Adulto', description: fat, nicheId: 'niche-apostas', networkId: 'net-telegram' })
    const counts = await repo.substantiveCounts('seed-temlinkaqui')
    expect(counts.niches).toEqual([{ id: 'niche-jogos', count: 2 }])
    expect(counts.networks).toEqual([{ id: 'net-telegram', count: 2 }])
  })

  it('grava resumo e string vazia não é chamada com espaço', async () => {
    resetLinksRepositoryForTest()
    const repo = getLinksRepository() as InMemoryLinksRepository
    const saved = await repo.updateFacetSummary({
      kind: 'niche', id: 'niche-jogos', tenantId: 'seed-temlinkaqui', summary: 'texto único',
    })
    expect(saved).toMatchObject({ summary: 'texto único' })
    const cleared = await repo.updateFacetSummary({
      kind: 'niche', id: 'niche-jogos', tenantId: 'seed-temlinkaqui', summary: null,
    })
    expect(cleared).toMatchObject({ summary: null })
    expect(await repo.updateFacetSummary({
      kind: 'niche', id: 'niche-jogos', tenantId: 'tenant-b', summary: 'x',
    })).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/repositories/links-repository.summary.spec.ts`

Expected: FAIL, `substantiveCounts` is not a function.

- [ ] **Step 3: Write minimal implementation**

Em `schema.prisma`, dentro de `model Niche` e `model Network`, depois de `isPublicFacet`:

```prisma
summary       String?
```

`backend/prisma/migrations/20261006120000_facet_summary/migration.sql`:

```sql
ALTER TABLE "niches" ADD COLUMN "summary" TEXT;
ALTER TABLE "networks" ADD COLUMN "summary" TEXT;
```

Em `NicheRecord` e `NetworkRecord`, acrescentar `summary: string | null`. No `reset()` da memória, os nichos e redes semeados usam `summary: null`.

Na interface `LinksRepository`, acrescentar os dois métodos da seção Interfaces.

Implementação em memória: filtrar `this.links` com `substantiveText`, dono ausente ou não `BANNED`, e nicho com `requiresAge !== true`. Agrupar por `nicheId` e `networkId`. `updateFacetSummary` acha a linha do tenant e grava `summary`.

Implementação Prisma de `substantiveCounts`:

```ts
const rows = await this.client.$queryRaw<Array<{ nicheId: string; networkId: string }>>`
  SELECT l."nicheId", l."networkId"
  FROM links l
  JOIN niches n ON n.id = l."nicheId"
  LEFT JOIN users u ON u.id = l."ownerId"
  WHERE l."tenantId" = ${tenantId}
    AND l.status = 'PUBLISHED'
    AND n."requiresAge" = false
    AND (l."ownerId" IS NULL OR u.status <> 'BANNED')
    AND char_length(btrim(l.description)) >= 80
    AND btrim(l.description) <> btrim(l.name)
`
```

Agrupe em JS nas duas listas `{ id, count }`. `listNiches` e `listNetworks` passam a selecionar `summary`. `updateFacetSummary` faz `update` com `where: { id, tenantId }` e devolve `null` se o count for 0. O raw de `findSearchFacetCandidates` não precisa de `summary`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/repositories/links-repository.summary.spec.ts`

Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/20261006120000_facet_summary/migration.sql backend/src/repositories/links-repository.ts backend/src/repositories/links-repository.summary.spec.ts
git commit -m "feat: store an optional facet summary"
```

---

### Task 3: SEO público e sitemap usam a régua

**Files:**
- Modify: `backend/src/http/sitemap-index.ts`
- Modify: `backend/src/http/controllers/@Catalog/routes.ts`
- Modify: `backend/src/http/controllers/@Links/routes.ts`
- Test: `backend/src/http/catalog.http.spec.ts`

**Interfaces:**
- Consumes: `facetIndexable`, `facetRobots`, `linkRobots`, `documentTitle`, `facetBlurb`, `substantiveText`, `LinksRepository.substantiveCounts`
- Produces: card público com `indexable: boolean`. `seo.structuredData` ausente quando a página não é indexável. `seo.title` com sufixo nas facetas e nos links. Corpo da faceta inclui `heading: string`.

- [ ] **Step 1: Write the failing test**

No `catalog.http.spec.ts`, troque o teste do nicho que hoje espera `title: 'Jogos'` e `robots: 'index,follow'`. O catálogo de teste não cria link substantivo no repositório, então a faceta fica fina:

```ts
expect(niche.json().seo).toMatchObject({
  title: 'Jogos | Tem Link Aqui',
  description: 'Links de Jogos organizados por rede.',
  canonical: 'https://temlinkaqui.com/nicho/jogos',
  robots: 'noindex,follow',
})
expect(niche.json().heading).toBe('Jogos')
expect(niche.json().seo.structuredData).toBeUndefined()
expect(network.json().seo).toMatchObject({
  title: 'Telegram | Tem Link Aqui',
  robots: 'noindex,follow',
})
const filtered = await app.inject({ method: 'GET', url: '/api/v1/niches/jogos?network=telegram', headers: { host: HOST } })
expect(filtered.json().seo).toMatchObject({
  canonical: 'https://temlinkaqui.com/nicho/jogos',
  robots: 'noindex,follow',
})
const cursorValue = Buffer.from(JSON.stringify({ kind: 'organic', activatedAt: null, id: 'no-nicho' }), 'utf8').toString('base64url')
const cursor = await app.inject({ method: 'GET', url: `/api/v1/niches/jogos?cursor=${cursorValue}`, headers: { host: HOST } })
expect(cursor.statusCode).toBe(200)
expect(cursor.json().seo.robots).toBe('noindex,follow')
```

Acrescente um teste novo:

```ts
it('faceta e link entram juntos quando há substância, e 18+ continua fora', async () => {
  const fat = 'c'.repeat(80)
  const niche = repo().niches.find((row) => row.id === 'niche-jogos')!
  niche.summary = fat
  repo().addLink({
    id: 'link-gordo', tenantId: TENANT, ownerId: 'ana', status: 'PUBLISHED',
    name: 'Receitas', description: fat, nicheId: 'niche-jogos', networkId: 'net-telegram',
  })
  repo().addLink({
    id: 'link-fino', tenantId: TENANT, ownerId: 'ana', status: 'PUBLISHED',
    name: 'Curto', description: 'x', nicheId: 'niche-jogos', networkId: 'net-telegram',
  })
  const page = await app.inject({ method: 'GET', url: '/api/v1/niches/jogos', headers: { host: HOST } })
  expect(page.json().seo).toMatchObject({
    title: 'Jogos | Tem Link Aqui',
    description: fat,
    robots: 'index,follow',
  })
  expect(page.json().seo.structuredData['@graph']).toEqual(expect.arrayContaining([
    expect.objectContaining({ '@type': 'CollectionPage' }),
    expect.objectContaining({ '@type': 'BreadcrumbList' }),
  ]))
  const open = await app.inject({ method: 'GET', url: '/api/v1/links/link-gordo', headers: { host: HOST } })
  expect(open.json().seo).toMatchObject({
    title: 'Receitas | Tem Link Aqui',
    robots: 'index,follow',
  })
  const thin = await app.inject({ method: 'GET', url: '/api/v1/links/link-fino', headers: { host: HOST } })
  expect(thin.statusCode).toBe(200)
  expect(thin.json().seo.robots).toBe('noindex,follow')
  expect(thin.json().seo.structuredData).toBeUndefined()
  const adultNiche = repo().niches.find((row) => row.id === 'niche-apostas')!
  adultNiche.summary = fat
  const adult = await app.inject({ method: 'GET', url: '/api/v1/niches/apostas', headers: { host: HOST, cookie: 'age=yes' } })
  expect(adult.json().seo.robots).toBe('noindex,nofollow')
  const map = await app.inject({ method: 'GET', url: '/api/v1/sitemap', headers: { host: HOST } })
  const paths = map.json().entries.map((row: { path: string }) => row.path)
  expect(paths).toEqual(expect.arrayContaining(['/', '/nicho/jogos', '/link/link-gordo']))
  expect(paths).not.toEqual(expect.arrayContaining(['/link/link-fino', '/nicho/apostas']))
})
```

No teste do link público que usa `description: 'bolos'`, troque `robots: 'index,follow'` por `noindex,follow` e remova a expectativa de `structuredData`. No teste do sitemap que espera `/nicho/jogos` e `/link/link-publico` com descrição `bolos`, espere só `/` e a ausência desses caminhos.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/http/catalog.http.spec.ts`

Expected: FAIL, `heading` ausente e `robots` ainda `index,follow` no nicho fino.

- [ ] **Step 3: Write minimal implementation**

Helper no controller de catálogo, usado por home, nicho e rede:

```ts
async function indexSnapshot(tenantId: string) {
  const [niches, networks, counts] = await Promise.all([
    getLinksRepository().listNiches(tenantId),
    getLinksRepository().listNetworks(tenantId),
    getLinksRepository().substantiveCounts(tenantId),
  ])
  const nicheCount = new Map(counts.niches.map((row) => [row.id, row.count]))
  const networkCount = new Map(counts.networks.map((row) => [row.id, row.count]))
  const nicheOk = new Map(niches.map((row) => [row.id, facetIndexable({
    isPublicFacet: row.isPublicFacet,
    requiresAge: row.requiresAge,
    summary: row.summary,
    substantiveCount: nicheCount.get(row.id) ?? 0,
  })]))
  return { niches, networks, nicheCount, networkCount, nicheOk }
}
```

`seo()` passa a receber `title` já decidido e omite `structuredData` quando `robots` não começa com `index`. Para faceta indexável, `structuredData` é:

```ts
{
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'CollectionPage', name: heading, description, url: canonical },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Início', item: `https://${host}/` },
        { '@type': 'ListItem', position: 2, name: heading, item: canonical },
      ],
    },
    ...(indexableIds.length > 0 ? [{
      '@type': 'ItemList',
      itemListElement: indexableIds.map((id, position) => ({
        '@type': 'ListItem',
        position: position + 1,
        url: `https://${host}/link/${id}`,
      })),
    }] : []),
  ],
}
```

`filtered` é `Boolean(query.network || query.niche || query.cursor)`. `heading` no JSON da faceta é `facet.name`. Description é `facetBlurb`. Title é `documentTitle('named', facet.name, tenant.name)`.

Cada card ganha `indexable: boolean`: o nicho do card está em `nicheOk` e `substantiveText(card.name, card.description)` é verdadeiro. Na home, o ItemList do frontend só usa esses ids. O `structuredData` da home continua `WebSite`; a lista fica no frontend, que já monta o `@graph`. Passe só os ids com `indexable === true`.

Em `linkSeo`, title vira `documentTitle('named', title, tenant.name)`. `blocked` cobre indisponível, nicho 18+ e dono banido. Dono banido e indisponível: `linkRobots({ blocked: true, ... })`. Link fino ou nicho fora: `noindex,follow` e sem `structuredData`. Link indexável inclui `WebPage` mais `BreadcrumbList` `Início / {nicho} / {nome}`.

`sitemap-index.ts` deixa de listar toda faceta pública. Para cada nicho e rede, chama `facetIndexable` com a contagem. Para cada link, inclui `/link/{id}` só se `substantiveText` e `nicheOk`. 18+ não entra. O modo teste e o Prisma usam `substantiveCounts` mais `listNiches` / `listNetworks`. Não duplique o filtro SQL do sitemap.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/http/catalog.http.spec.ts src/domain/catalog/index-policy.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/http/sitemap-index.ts backend/src/http/controllers/@Catalog/routes.ts backend/src/http/controllers/@Links/routes.ts backend/src/http/catalog.http.spec.ts
git commit -m "fix: index only catalog pages with substance"
```

---

### Task 4: Admin grava o resumo

**Files:**
- Create: `backend/src/http/controllers/@Admin/facets.ts`
- Create: `backend/src/http/controllers/@Admin/facets.spec.ts`
- Modify: `backend/src/http/controllers/@Admin/routes.ts`

**Interfaces:**
- Consumes: `parseSummary`, `facetIndexable`, `substantiveCounts`, `updateFacetSummary`, `getAuditLogsRepository().create`
- Produces:
  - `GET /api/v1/admin/facets` → `{ niches: FacetRow[]; networks: FacetRow[] }`
  - `FacetRow = { id, name, slug, requiresAge, isPublicFacet, summary, substantiveCount, indexable }`
  - `PATCH /api/v1/admin/facets/:kind/:id` body `{ summary: string | null }`

- [ ] **Step 1: Write the failing test**

Siga o `beforeAll` / `token()` de `catalog.http.spec.ts`. Casos:

```ts
it('admin lê a régua pronta e grava resumo', async () => {
  const fat = 'd'.repeat(80)
  const headers = { host: HOST, authorization: `Bearer ${token('ana', TENANT, 'ADMIN')}` }
  const denied = await app.inject({ method: 'GET', url: '/api/v1/admin/facets', headers: { ...headers, authorization: `Bearer ${token('ana', TENANT, 'USER')}` } })
  expect(denied.statusCode).toBe(403)
  const foreign = await app.inject({ method: 'PATCH', url: '/api/v1/admin/facets/niche/niche-jogos', headers: { host: HOST, authorization: `Bearer ${token('bia', TENANT_B, 'ADMIN')}`, 'content-type': 'application/json' }, payload: { summary: fat } })
  expect(foreign.statusCode).toBe(404)
  const saved = await app.inject({ method: 'PATCH', url: '/api/v1/admin/facets/niche/niche-jogos', headers: { ...headers, 'content-type': 'application/json' }, payload: { summary: `  ${fat}  ` } })
  expect(saved.statusCode).toBe(200)
  expect(saved.json().summary).toBe(fat)
  const audit = await getAuditLogsRepository().latest({ tenantId: TENANT, entityType: 'Niche', entityId: 'niche-jogos', action: 'facet.summary.update' })
  expect(audit?.before).toEqual({ summary: null })
  expect(audit?.after).toEqual({ summary: fat })
  const listed = await app.inject({ method: 'GET', url: '/api/v1/admin/facets', headers })
  expect(listed.json().niches.find((row: { id: string }) => row.id === 'niche-jogos')).toMatchObject({ summary: fat, indexable: true, substantiveCount: 0 })
  const empty = await app.inject({ method: 'PATCH', url: '/api/v1/admin/facets/niche/niche-jogos', headers: { ...headers, 'content-type': 'application/json' }, payload: { summary: '   ' } })
  expect(empty.json().summary).toBeNull()
  const huge = await app.inject({ method: 'PATCH', url: '/api/v1/admin/facets/niche/niche-jogos', headers: { ...headers, 'content-type': 'application/json' }, payload: { summary: 'e'.repeat(501) } })
  expect(huge.statusCode).toBe(400)
  const markup = await app.inject({ method: 'PATCH', url: '/api/v1/admin/facets/network/net-telegram', headers: { ...headers, 'content-type': 'application/json' }, payload: { summary: 'oi <b>' } })
  expect(markup.statusCode).toBe(400)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/http/controllers/@Admin/facets.spec.ts`

Expected: FAIL, 404 de rota não registrada.

- [ ] **Step 3: Write minimal implementation**

`facets.ts` exporta `registerFacetRoutes(app)`.

Ordem do guard, antes de procurar a faceta:

1. Host desconhecido: 404, como o resto do admin.
2. `request.user.tenantId !== tenant.id`: 404.
3. `request.user.role !== 'ADMIN'`: 403 com `buildError({ code: forbidden, message: 'Acesso negado.' })`.

GET monta as linhas com `facetIndexable`. Não recalcule a regra na resposta com outro critério. `requiresAge` de rede ausente conta como `false`.

PATCH: `kind` só `niche` ou `network`, senão 404. Body Zod `{ summary: z.string().nullable() }.strict()`. `parseSummary` com `ok: false` responde 400 `validation` e não chama o repositório. `updateFacetSummary` `null` responde 404. Auditoria:

```ts
await getAuditLogsRepository().create({
  tenantId: tenant.id,
  actorId: request.user.sub,
  action: 'facet.summary.update',
  entityType: kind === 'niche' ? 'Niche' : 'Network',
  entityId: id,
  before: { summary: previous },
  after: { summary: parsed.summary },
  requestId: request.id,
})
```

`previous` é o `summary` lido antes do update. Resposta 200: a `FacetRow` atualizada.

Registre em `adminRoutes`: `await registerFacetRoutes(app)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/http/controllers/@Admin/facets.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/http/controllers/@Admin/facets.ts backend/src/http/controllers/@Admin/facets.spec.ts backend/src/http/controllers/@Admin/routes.ts
git commit -m "feat: let an admin write the facet summary"
```

---

### Task 5: Página pública

**Files:**
- Create: `frontend/src/components/domain/breadcrumb.tsx`
- Modify: `frontend/src/components/domain/facet-catalog.tsx`
- Modify: `frontend/src/components/domain/facet-catalog.test.tsx`
- Modify: `frontend/src/app/nicho/[slug]/page.tsx`
- Modify: `frontend/src/app/rede/[slug]/page.tsx`
- Modify: `frontend/src/app/link/[id]/page.tsx`
- Modify: `frontend/src/app/page.tsx`
- Modify: `frontend/src/domain/crawler-policy.test.ts`

**Interfaces:**
- Consumes: `seo.title`, `seo.description`, `seo.robots`, `seo.structuredData`, `heading` da Task 3. Card `indexable`.
- Produces: `Breadcrumb({ items: Array<{ href: string; name: string }> })`. H1 da faceta é `heading`, não `seo.title`.

- [ ] **Step 1: Write the failing test**

Em `crawler-policy.test.ts`:

```ts
it('noindex,follow não marca follow como falso', () => {
  expect(metadataFromSeo({
    title: 'Jogos | Tem Link Aqui',
    description: 'Links de Jogos organizados por rede.',
    canonical: 'https://temlinkaqui.com/nicho/jogos',
    robots: 'noindex,follow',
  }).robots).toEqual({ index: false, follow: true })
})
```

Em `facet-catalog.test.tsx`, o body de teste passa a ter `heading: 'Jogos'` e `seo.title: 'Jogos | Tem Link Aqui'`. Asserções:

```ts
expect(screen.getByRole('heading', { level: 1, name: 'Jogos' })).toBeTruthy()
expect(screen.getByRole('navigation', { name: 'Trilha' }).textContent).toContain('Início')
expect(screen.getByRole('link', { name: 'Início' }).getAttribute('href')).toBe('/')
```

Segundo caso: `seo.description` igual ao resumo longo, e o parágrafo visível é esse resumo, não a frase automática. Terceiro caso: `robots: 'noindex,follow'` não deixa `script[type="application/ld+json"]` no documento.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/crawler-policy.test.ts src/components/domain/facet-catalog.test.tsx`

Expected: FAIL, heading ainda é o `seo.title` com sufixo, ou navegação ausente.

- [ ] **Step 3: Write minimal implementation**

`breadcrumb.tsx`:

```tsx
export function Breadcrumb({ items }: { items: Array<{ href: string; name: string }> }) {
  return (
    <nav className="detail-back" aria-label="Trilha">
      {items.map((item, index) => (
        <span key={item.href}>
          {index > 0 ? <span aria-hidden="true"> / </span> : null}
          {index === items.length - 1 ? <span>{item.name}</span> : <a href={item.href}>{item.name}</a>}
        </span>
      ))}
    </nav>
  )
}
```

`FacetCatalog` exige `heading: string` no body. O H1 renderiza `{heading}`, com `TitleMark` como hoje. O parágrafo continua `usableDescription`, comparando a description com o `heading`, não com o `seo.title`. Troque o `<a className={backClass}>` pela trilha `[{ href: '/', name: 'Início' }, { href: facetHref(route, slug, null), name: heading }]`. JSON-LD só se `robots` começa com `index` e `structuredData` existe.

`page.tsx` da home filtra os ids:

```tsx
[...home.sponsored, ...home.organic].filter((row) => row.indexable).map((row) => row.id)
```

Acrescente `indexable?: boolean` no tipo `Card`. Sem o campo, o id não entra na lista.

Na página do link, substitua `DetailContext` por `Breadcrumb` com Início, o nicho (ou a rede, se não houver nicho) e o nome do link como último item sem link. O H1 continua `link.name`. Não coloque o sufixo do tenant no H1.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/crawler-policy.test.ts src/components/domain/facet-catalog.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/domain/breadcrumb.tsx frontend/src/components/domain/facet-catalog.tsx frontend/src/components/domain/facet-catalog.test.tsx frontend/src/app/nicho/[slug]/page.tsx frontend/src/app/rede/[slug]/page.tsx frontend/src/app/link/[id]/page.tsx frontend/src/app/page.tsx frontend/src/domain/crawler-policy.test.ts
git commit -m "fix: show the brand in the title and the name in the heading"
```

---

### Task 6: Seção no admin

**Files:**
- Create: `frontend/src/app/admin/configuracoes/facet-summaries.tsx`
- Create: `frontend/src/app/admin/configuracoes/facet-summaries.test.tsx`
- Modify: `frontend/src/app/admin/configuracoes/page.tsx`

**Interfaces:**
- Consumes: `GET /api/v1/admin/facets` e `PATCH /api/v1/admin/facets/:kind/:id` da Task 4. `api()` de `@/lib/api`.
- Produces: seção "Textos do catálogo" renderizada depois de `SettingsEditor`.

- [ ] **Step 1: Write the failing test**

```tsx
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FacetSummaries } from './facet-summaries'

const api = vi.fn()
vi.mock('@/lib/api', () => ({ api: (...args: unknown[]) => api(...args) }))

afterEach(() => cleanup())

const row = {
  id: 'niche-jogos', name: 'Jogos', slug: 'jogos', requiresAge: false, isPublicFacet: true,
  summary: null, substantiveCount: 3, indexable: true,
}

describe('resumos do catálogo', () => {
  it('mostra se entra na busca e conserva o texto quando salvar falha', async () => {
    api.mockResolvedValueOnce({ status: 200, body: { niches: [row], networks: [] } })
    render(<FacetSummaries />)
    expect(await screen.findByText('Na busca')).toBeTruthy()
    const field = screen.getByRole('textbox', { name: 'Resumo de Jogos' })
    await userEvent.type(field, 'texto')
    api.mockResolvedValueOnce({ status: 400, body: { message: 'Valor inválido.' } })
    await userEvent.click(screen.getByRole('button', { name: 'Salvar Jogos' }))
    expect(await screen.findByText('Valor inválido.')).toBeTruthy()
    expect((field as HTMLTextAreaElement).value).toBe('texto')
  })

  it('não finge lista vazia quando o carregamento falha', async () => {
    api.mockResolvedValueOnce({ status: 500, body: { message: 'falhou' } })
    render(<FacetSummaries />)
    expect(await screen.findByText('Não foi possível carregar os textos.')).toBeTruthy()
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('diz que 18+ continua fora da busca', async () => {
    api.mockResolvedValueOnce({
      status: 200,
      body: { niches: [{ ...row, id: 'niche-apostas', name: 'Apostas', requiresAge: true, indexable: false }], networks: [] },
    })
    render(<FacetSummaries />)
    expect(await screen.findByText('18+, fora da busca')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/admin/configuracoes/facet-summaries.test.tsx`

Expected: FAIL, module not found.

- [ ] **Step 3: Write minimal implementation**

`FacetSummaries` faz GET ao montar. Status diferente de 200 mostra `Não foi possível carregar os textos.` e nenhum campo. Cada linha: nome, slug, o rótulo `Na busca`, `Fora da busca` ou `18+, fora da busca` quando `requiresAge`, textarea `aria-label={`Resumo de ${name}`}`, botão `Salvar ${name}`.

PATCH envia `{ summary: value.trim() ? value : null }`. 200 substitui a linha pela resposta. Outro status mostra `body.message` ou `Não foi possível salvar.` O valor do campo não volta ao que estava antes do clique.

`page.tsx`:

```tsx
return (
  <>
    <SettingsEditor />
    <FacetSummaries />
  </>
)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/admin/configuracoes/facet-summaries.test.tsx`

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/admin/configuracoes/facet-summaries.tsx frontend/src/app/admin/configuracoes/facet-summaries.test.tsx frontend/src/app/admin/configuracoes/page.tsx
git commit -m "feat: edit facet summaries from settings"
```

---

## Self-review

- Régua, títulos, trilha, JSON-LD, resumo, admin, erros de carga e de gravação, e os testes do spec estão nas Tasks 1 a 6.
- Search Console não tem tarefa.
- `indexable` do GET sai de `facetIndexable`, a mesma função do sitemap.
- O status 403/404 deste endpoint está escrito na Task 4 e não herda `requireAdmin`.
- Nomes batem: `substantiveCounts`, `updateFacetSummary`, `parseSummary`, `heading`, `FacetSummaries`.
