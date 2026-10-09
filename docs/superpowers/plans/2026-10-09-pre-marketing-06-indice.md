# Índice e catálogo fino Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resumo longo deixa de indexar faceta vazia, o `lastmod` da home deixa de ser o horário do request, e a home consegue pedir a próxima página.

**Architecture:** `facetIndexable` exige `substantiveCount >= MIN_LINKS` sempre. O resumo continua na página para quem chegou nela, e o robots dessa página fica `noindex,follow` enquanto a contagem não atingir 3. `entriesFrom` já usa `facetIndexable`, então o sitemap acompanha. O `updatedAt` da home passa a ser o máximo entre os `updatedAt` dos links indexáveis; sem links, a entrada da home não manda `lastmod`. A home do frontend usa `nextCursor` com um link “Mostrar mais” que pede `?cursor=` na API já existente.

**Tech Stack:** Vitest, Playwright.

## Global Constraints

- `MIN_LINKS` continua 3. `MIN_TEXT` continua 80 para o link, não como atalho da faceta.
- Faceta `requiresAge` ou não pública continua `noindex,nofollow`.
- Não remover resumos já gravados.
- Não apagar o link de produção citado na auditoria. Isso está no relatório humano.
- “Mostrar mais” só aparece quando `nextCursor` não é null.

---

### Task 1: Régua

**Files:**
- Modify: `backend/src/domain/catalog/index-policy.ts`
- Modify: `backend/src/domain/catalog/index-policy.spec.ts`

- [ ] **Step 1: Change the existing test so the old behavior fails**

No teste `faceta entra com 3 links ou com resumo de 80`, trocar a expectativa do resumo com contagem 0 de `true` para `false`. Acrescentar:

```ts
expect(facetIndexable({ ...base, substantiveCount: 3, summary: fat })).toBe(true)
expect(facetRobots({ ...open, substantiveCount: 0, summary: fat })).toBe('noindex,follow')
```

O nome do teste passa a ser `faceta só entra com 3 links substantivos`.

- [ ] **Step 2: Run and confirm FAIL**

Run: `npx vitest run src/domain/catalog/index-policy.spec.ts` from `backend`
Expected: FAIL na linha do resumo com contagem 0

- [ ] **Step 3: Change `facetIndexable`**

Remover o retorno antecipado do resumo. A função fica:

```ts
export function facetIndexable(input: {
  isPublicFacet: boolean
  requiresAge: boolean
  summary: string | null
  substantiveCount: number
}): boolean {
  if (!input.isPublicFacet || input.requiresAge) return false
  return input.substantiveCount >= MIN_LINKS
}
```

O parâmetro `summary` permanece na assinatura para não quebrar quem chama, e o teste continua passando summary. Não usar o valor.

- [ ] **Step 4: Run the spec and any catalog HTTP spec that esperava index por resumo**

Run: `npx vitest run src/domain/catalog/index-policy.spec.ts src/http/catalog.http.spec.ts` from `backend`
Expected: PASS. Se `catalog.http.spec.ts` ou `catalog.pg.spec.ts` exigir `index,follow` numa faceta sem 3 links, atualizar a expectativa para `noindex,follow` nesta task. Isso é o comportamento novo, não um desvio.

- [ ] **Step 5: Commit**

```bash
git add backend/src/domain/catalog/index-policy.ts backend/src/domain/catalog/index-policy.spec.ts backend/src/http/catalog.http.spec.ts
git commit -m "fix: não indexa faceta só porque o resumo é longo"
```

### Task 2: lastmod estável

**Files:**
- Modify: `backend/src/http/sitemap-index.ts`
- Test: spec ao lado, `backend/src/http/sitemap-index.spec.ts`, testando `entriesFrom` se ela for exportada. Exportá-la é aceitável.

- [ ] **Step 1: Write the failing test**

`entriesFrom` com links cujo `updatedAt` máximo é `2026-10-06T00:00:00.000Z` produz home `lastmod` igual a essa data, não à hora do teste. Sem links substantivos, a entrada `/` não tem `updatedAt` igual ao instante do teste: usar `updatedAt: null` no tipo e o gerador do Next omite `lastModified` quando null. Ajustar `sitemapUrls` em `frontend/src/domain/crawler-policy.ts` para não setar `lastModified` quando o campo vier vazio. Teste de unidade lá.

- [ ] **Step 2: Run and confirm FAIL**

- [ ] **Step 3: Implement**

Tirar `const now = new Date().toISOString()` da home. Privacidade e termos, se a etapa 2 já tiver entrado, mantêm a data fixa. Se a etapa 2 ainda não tiver entrado, esta task não cria essas URLs.

- [ ] **Step 4: Run the sitemap specs**

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/http/sitemap-index.ts backend/src/http/sitemap-index.spec.ts frontend/src/domain/crawler-policy.ts frontend/src/domain/crawler-policy.test.ts
git commit -m "fix: lastmod da home segue o conteúdo"
```

### Task 3: Mostrar mais

**Files:**
- Modify: `frontend/src/app/page.tsx` e, se a lista for só servidor, um client `frontend/src/components/domain/home-more.tsx`
- Test: `frontend/e2e/catalog.spec.ts` ganha um caso só se o seed tiver mais de 24 links. O seed de E2E não tem. Então a prova é unitária do parser de cursor, que já existe, mais um teste de componente que, dado `nextCursor: 'abc'`, renderiza o link, e dado `null`, não renderiza.

`frontend/src/components/domain/home-more.test.tsx`:

```tsx
it('esconde o controle sem cursor', () => {
  render(<HomeMore cursor={null} />)
  expect(screen.queryByRole('link', { name: 'Mostrar mais' })).toBeNull()
})
```

O link aponta para `/?cursor=` codificado. A page servidor lê `searchParams.cursor` e repassa na query da API. Não inventar página `/pagina/2`.

- [ ] **Step 1: Write the failing component test**

- [ ] **Step 2: Run and confirm FAIL**

- [ ] **Step 3: Implement `HomeMore` and pass `nextCursor` from the home payload**

A home hoje descarta `nextCursor` mesmo a API mandando. Incluir o campo no tipo `Home`.

- [ ] **Step 4: Run the component test**

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/domain/home-more.tsx frontend/src/components/domain/home-more.test.tsx frontend/src/app/page.tsx
git commit -m "feat: a home pede a página seguinte do catálogo"
```

### Task 4: Confirmação da etapa

- [ ] **Step 1: Run**

From `backend`: `npx vitest run src/domain/catalog/index-policy.spec.ts src/http/sitemap-index.spec.ts src/http/catalog.http.spec.ts`

From `frontend`: `npx vitest run src/components/domain/home-more.test.tsx src/domain/crawler-policy.test.ts`

Expected: PASS. Playwright do catálogo existente (`e2e/catalog.spec.ts`) roda se a mudança de robots quebrar a home do seed. Se quebrar, corrigir a expectativa do E2E nesta etapa: faceta do seed com menos de 3 links substantivos fica `noindex`.
