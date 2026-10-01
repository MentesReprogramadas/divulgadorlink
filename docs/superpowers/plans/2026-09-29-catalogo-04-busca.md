# Busca híbrida — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Embedding assíncrono e ranking híbrido único para orgânico e pago, com idade fora da resposta até a sessão confirmar.

**Architecture:** Publicar enfileira `embed-link`. A busca embute a consulta na hora, soma texto e vetor com pesos de `Config` e corta no mesmo limiar. Não há serviço de busca separado.

**Tech Stack:** `EmbeddingService` já existente. Postgres `vector(1536)`. Índice HNSW.

## Global Constraints

Herdadas do mapa. Pagar não cria relevância. Sem cauda de nicho. Sem vetor puro. Nicho com idade não compra `HOME` nem entra na home padrão. Isso o plano 5 recusa; este plano não desenha esses itens.

---

### Task 1: Embedding na fila

**Files:**
- Create: `backend/src/use-cases/@Search/embed-link.ts`
- Test: `backend/src/use-cases/@Search/embed-link.spec.ts`
- Modify: `backend/src/worker.ts`
- Modify: `backend/prisma/schema.prisma`

**Interfaces:**
- Consumes: `buildLinkEmbeddingText` e `EmbeddingService`
- Produces: `embedLink`. Job `embed-link` com `{ linkId }`.

- [x] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { buildLinkEmbeddingText } from '@/domain/embeddings/embedding-service'
import { embedLink } from '@/use-cases/@Search/embed-link'

describe('embedding', () => {
  it('grava o vetor fora da request e exige 1536', async () => {
    const saved: number[][] = []
    await embedLink({
      link: { name: 'Ferrari', description: 'esportivo', niche: 'Carros', network: 'Telegram' },
      embedding: { embed: async () => Array.from({ length: 1536 }, () => 0.1) },
      save: async (vector) => { saved.push(vector) },
    })
    expect(buildLinkEmbeddingText({
      name: 'Ferrari', description: 'esportivo', niche: 'Carros', network: 'Telegram',
    })).toBe('Ferrari\nesportivo\nCarros\nTelegram')
    expect(saved[0]).toHaveLength(1536)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/use-cases/@Search/embed-link.spec.ts`
Expected: FAIL

- [x] **Step 3: Write minimal implementation**

```ts
import { EMBEDDING_DIMENSIONS, buildLinkEmbeddingText, type EmbeddingService } from '@/domain/embeddings/embedding-service'

export async function embedLink(input: {
  link: { name: string; description: string; niche: string; network: string }
  embedding: EmbeddingService
  save: (vector: number[]) => Promise<void>
}): Promise<void> {
  const vector = await input.embedding.embed(buildLinkEmbeddingText(input.link))
  if (vector.length !== EMBEDDING_DIMENSIONS) throw new Error('dimensão')
  await input.save(vector)
}
```

Migration: `CREATE EXTENSION IF NOT EXISTS vector;` coluna `vector(1536)` e índice HNSW. Publicar ou mudar nome, descrição, nicho ou rede enfileira o job. O POST do link não espera a OpenAI.

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- src/use-cases/@Search/embed-link.spec.ts src/adapters/adapters.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/prisma backend/src/use-cases/@Search backend/src/worker.ts
git commit -m "feat: gera embedding do link na fila"
```

---

### Task 2: Ranking, destino da busca e idade

**Files:**
- Create: `backend/src/use-cases/@Search/rank-links.ts`
- Test: `backend/src/use-cases/@Search/rank-links.spec.ts`
- Create: `backend/src/http/controllers/@Search/routes.ts`

**Interfaces:**
- Consumes: pesos e limiar de `Config`. Cookie de sessão `age`, não gravado na conta.
- Produces: `rankSearch`, `rankHome`, `rankNiche`, `resolveSearchTarget`, `visibleForAge`. `GET /api/v1/search?q=`.

- [x] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { rankHome, rankSearch, resolveSearchTarget, visibleForAge } from '@/use-cases/@Search/rank-links'

const rows = [
  { id: 'novo', relevance: 0.95, searchActivatedAt: new Date('2026-09-02'), homeActivatedAt: null, nicheActivatedAt: null, requiresAge: false },
  { id: 'antigo', relevance: 0.4, searchActivatedAt: new Date('2026-09-01'), homeActivatedAt: null, nicheActivatedAt: null, requiresAge: false },
  { id: 'org', relevance: 0.9, searchActivatedAt: null, homeActivatedAt: null, nicheActivatedAt: new Date('2026-09-01'), requiresAge: false },
  { id: 'baixo', relevance: 0.1, searchActivatedAt: null, homeActivatedAt: null, nicheActivatedAt: null, requiresAge: false },
  { id: 'adulto', relevance: 0.99, searchActivatedAt: null, homeActivatedAt: null, nicheActivatedAt: null, requiresAge: true },
]

describe('busca', () => {
  it('tira o patrocinado do orgânico e ordena o bloco pela ativação', () => {
    const result = rankSearch(visibleForAge(rows, 'yes'), 0.2)
    expect(result.sponsored.map((link) => link.id)).toEqual(['antigo', 'novo'])
    expect(result.organic.map((link) => link.id)).toEqual(['org'])
  })

  it('omite o nicho com idade antes de qualquer campo, sem avisar o que saiu', () => {
    const visible = visibleForAge(rows, 'no')
    expect(visible.map((link) => link.id)).not.toContain('adulto')
    expect(JSON.stringify(visible)).not.toContain('adulto')
  })

  it('não promove NICHE na busca de nome livre', () => {
    const result = rankSearch(visibleForAge(rows, 'yes'), 0.2)
    expect(result.sponsored.map((link) => link.id)).not.toContain('org')
  })

  it('abre a página do nicho quando a consulta é o nicho', () => {
    expect(resolveSearchTarget('Apostas', [{ slug: 'apostas', name: 'Apostas' }], [])).toEqual({
      kind: 'niche', slug: 'apostas',
    })
  })

  it('home paga ordena pela ativação e não usa o corte da busca', () => {
    const home = rankHome([
      { id: 'b', relevance: 0.1, homeActivatedAt: new Date('2026-09-02') },
      { id: 'a', relevance: 0.9, homeActivatedAt: new Date('2026-09-01') },
      { id: 'org', relevance: 0.5, homeActivatedAt: null },
    ])
    expect(home.sponsored.map((link) => link.id)).toEqual(['a', 'b'])
    expect(home.organic.map((link) => link.id)).toEqual(['org'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/use-cases/@Search/rank-links.spec.ts`
Expected: FAIL

- [x] **Step 3: Write minimal implementation**

```ts
interface SearchRow {
  id: string
  relevance: number
  searchActivatedAt: Date | null
  requiresAge: boolean
}

export function visibleForAge<T extends { requiresAge: boolean }>(rows: T[], age: 'yes' | 'no' | 'unknown'): T[] {
  if (age === 'yes') return rows
  return rows.filter((row) => !row.requiresAge)
}

export function relevanceScore(textScore: number, semanticScore: number, textWeight: number, semanticWeight: number): number {
  return textWeight * textScore + semanticWeight * semanticScore
}

export function rankSearch(rows: SearchRow[], threshold: number) {
  const eligible = rows.filter((row) => row.relevance >= threshold)
  const sponsored = eligible
    .filter((row) => row.searchActivatedAt)
    .sort((a, b) => a.searchActivatedAt!.getTime() - b.searchActivatedAt!.getTime())
  const sponsoredIds = new Set(sponsored.map((row) => row.id))
  const organic = eligible
    .filter((row) => !sponsoredIds.has(row.id))
    .sort((a, b) => b.relevance - a.relevance)
  return { sponsored, organic }
}

export function rankHome(rows: { id: string; relevance: number; homeActivatedAt: Date | null }[]) {
  const sponsored = rows
    .filter((row) => row.homeActivatedAt)
    .sort((a, b) => a.homeActivatedAt!.getTime() - b.homeActivatedAt!.getTime())
  const organic = rows.filter((row) => !row.homeActivatedAt).sort((a, b) => b.relevance - a.relevance)
  return { sponsored, organic }
}

export function resolveSearchTarget(
  query: string,
  niches: { slug: string; name: string }[],
  networks: { slug: string; name: string }[],
): { kind: 'niche' | 'network' | 'results'; slug: string | null } {
  const needle = query.trim().toLowerCase()
  const niche = niches.find((item) => item.slug === needle || item.name.toLowerCase() === needle)
  if (niche) return { kind: 'niche', slug: niche.slug }
  const network = networks.find((item) => item.slug === needle || item.name.toLowerCase() === needle)
  if (network) return { kind: 'network', slug: network.slug }
  return { kind: 'results', slug: null }
}
```

`relevanceScore(textScore, semanticScore, textWeight, semanticWeight)` devolve `textWeight * textScore + semanticWeight * semanticScore`. Os pesos e o corte vêm de `readConfig` na borda HTTP. `rankSearch` não importa `INITIAL_CONFIG`. O `0.2` do teste é fixture da função pura, não `SEARCH_RELEVANCE_THRESHOLD`. A SQL devolve no máximo os candidatos acima do corte, já sem nicho `requiresAge` quando a sessão não confirmou. `rankNiche` é `rankHome` trocando `homeActivatedAt` por `nicheActivatedAt`. Home de rede grava superfície `NICHE` no plano 6; aqui ela usa o mesmo ranking de nicho. Autocomplete chama `rankSearch` com limite 8. Não há preenchimento por nicho vizinho. Confirmar idade na sessão devolve os itens na mesma lista. Recusar ou fechar segue sem eles e sem contagem do que foi omitido. Cookie some quando o browser fecha.

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- src/use-cases/@Search/rank-links.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/use-cases/@Search backend/src/http/controllers/@Search
git commit -m "feat: busca híbrida com o mesmo corte para pago e orgânico"
```

## Gate deste plano

A query de busca tem `WHERE` de idade e de limiar. O teste de omissão não vaza o id do link adulto. Embedding não roda dentro do POST.

## Status de implementação

Reconciliado em 2026-09-30 (Task 10), contra o código e as suítes do mesmo dia: backend `npm test` 198/198 (50 arquivos), `test:pg` 30/30, frontend 7/7, Playwright 15/15 em duas execuções seguidas (uma terceira anterior teve 1 falha intermitente, ver plano 07), typecheck, lint, build e `npm audit --audit-level=high` sem vulnerabilidade nos dois workspaces.

Regra das marcas: Step 1 e Step 3 marcados quando o spec e a implementação declarados existem; Step 4 marcado quando o spec passa numa dessas suítes. Step 2 ("ver falhar") é histórico e não se prova retroativamente: fica `[ ]`. Step 5 (commit) não foi executado por instrução: fica `[ ]`. Nenhum histórico foi apagado.

| Task | Status | Evidência |
|---|---|---|
| Task 1: Embedding na fila | PASS (fila e adapter) / BLOCKED_EXTERNAL (OpenAI real) | `embed-link.spec.ts`, `adapters.spec.ts` (sem chave falha sem chamar o provedor) |
| Task 2: Ranking, destino da busca e idade | PASS (regra) / OPEN (escala) | `rank-links.spec.ts`. EXPLAIN com 100k links: `hybridSearchSql` 195-203 ms, Parallel Seq Scan, sem `LIMIT`; o índice HNSW não é usado. Corrigir muda o conjunto de candidatos do `rankSearch`: decisão de arquitetura |
