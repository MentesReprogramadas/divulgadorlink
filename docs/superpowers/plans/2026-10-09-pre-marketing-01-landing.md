# Landing /divulgar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A URL do anúncio fala com quem tem um link, não linka faceta restrita, e a home em 390px não corta o nome do nicho.

**Architecture:** Página estática em `frontend/src/app/divulgar/page.tsx` com header próprio. O layout raiz lê `x-pathname`, setado no middleware, e omite Busca e o link da marca para `/` quando o caminho é `/divulgar`. A imagem Open Graph sai de `opengraph-image.tsx`. O corte dos chips é CSS em `.facet-line` abaixo de 720px.

**Tech Stack:** Next.js 15, React 19, Playwright, Vitest.

## Global Constraints

- Não alterar o h1 da home.
- Não mudar `NICHE_LEAD`.
- A página `/divulgar` não contém os textos: Adulto, Apostas, Ganhar Dinheiro, Fansly, Fatal Model, OnlyFans, Privacy.
- A marca nessa URL aponta para `/divulgar`.
- Não há link para `/`, `/busca`, `/nicho` ou `/rede`.
- CTA deslogado: `/cadastro`. Logado sem `canSubmit`: `/painel/verificar`. Logado com `canSubmit`: `/painel/links/novo`.
- Copy fixa, sem número de usuários e sem depoimento.

---

### Task 1: Regra do destino do CTA

**Files:**
- Create: `frontend/src/domain/advertise.ts`
- Test: `frontend/src/domain/advertise.test.ts`

**Interfaces:**
- Consumes: nada
- Produces: `advertiseCta(session: { canSubmit: boolean } | null): { href: string; label: string }` e `AD_FORBIDDEN_PATTERN: RegExp`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { AD_FORBIDDEN_PATTERN, advertiseCta } from './advertise'

describe('destino do anúncio', () => {
  it('manda quem não tem sessão para o cadastro', () => {
    expect(advertiseCta(null)).toEqual({ href: '/cadastro', label: 'Publicar um link' })
  })

  it('manda quem não confirmou o e-mail para a verificação', () => {
    expect(advertiseCta({ canSubmit: false })).toEqual({ href: '/painel/verificar', label: 'Confirmar e-mail' })
  })

  it('manda quem já pode enviar para o formulário', () => {
    expect(advertiseCta({ canSubmit: true })).toEqual({ href: '/painel/links/novo', label: 'Publicar um link' })
  })

  it('recusa o vocabulário restrito', () => {
    for (const sample of ['Adulto 18+', 'Apostas', 'Ganhar Dinheiro', 'OnlyFans', 'Fansly', 'Fatal Model', 'Privacy']) {
      expect(AD_FORBIDDEN_PATTERN.test(sample)).toBe(true)
    }
    expect(AD_FORBIDDEN_PATTERN.test('Publicar um link')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/advertise.test.ts` from `frontend`
Expected: FAIL, module not found

- [ ] **Step 3: Write minimal implementation**

```ts
export const AD_FORBIDDEN_PATTERN = /adulto|apostas|ganhar dinheiro|onlyfans|fansly|fatal model|privacy/i

export function advertiseCta(session: { canSubmit: boolean } | null): { href: string; label: string } {
  if (!session) return { href: '/cadastro', label: 'Publicar um link' }
  if (!session.canSubmit) return { href: '/painel/verificar', label: 'Confirmar e-mail' }
  return { href: '/painel/links/novo', label: 'Publicar um link' }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/advertise.test.ts` from `frontend`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/domain/advertise.ts frontend/src/domain/advertise.test.ts
git commit -m "test: define o destino do anúncio"
```

### Task 2: Página e metadados

**Files:**
- Create: `frontend/src/app/divulgar/page.tsx`
- Create: `frontend/src/app/divulgar/opengraph-image.tsx`
- Modify: `frontend/src/middleware.ts`
- Modify: `frontend/src/app/layout.tsx`
- Modify: `frontend/src/domain/crawler-policy.ts` only if `/divulgar` must stay indexável. Não adicionar em `PRIVATE_PATHS`.

**Interfaces:**
- Consumes: `advertiseCta`
- Produces: rota `/divulgar` com título `Publique o seu link | Tem Link Aqui`

Copy obrigatória, nesta ordem:

- h1: `Publique o seu link.`
- parágrafo: `O Tem Link Aqui coloca o seu site, grupo ou perfil num catálogo por tema e rede. Publicar é grátis. Uma pessoa analisa o envio antes de ele ir ao ar. O destaque é pago e só existe depois que o link foi publicado.`
- lista: URL `https` pública; um tema; uma rede; sem promessa de audiência.
- botão com o retorno de `advertiseCta`. A página é servidor. Ler a sessão por `GET` interno já usado no painel (`/api` não). Use o cookie `catalogo_role` só para saber se há sessão de UI; o destino `canSubmit` vem de `GET /v1/auth/session` via `forward` no servidor, o mesmo cliente de `frontend/src/lib/upstream.ts`. Se a sessão falhar, usar `advertiseCta(null)`.

`opengraph-image.tsx` usa `ImageResponse` de `next/og`, 1200×630, fundo `#f3f6f4`, texto `Publique o seu link.` e `Publicar é grátis. A análise é humana.` Sem foto de pessoa e sem número.

Middleware: o matcher deixa de ser só `/admin/:path*`. Passe a cobrir tudo menos `_next`, arquivos com ponto e `bff`. Em todo request, copie `x-pathname` para os request headers. A regra atual de esconder `/admin` permanece.

`layout.tsx`: se `x-pathname` for `/divulgar` ou começar com `/divulgar/`, a marca aponta para `/divulgar` e a nav não inclui Busca. Inclui só os `accountLinks` já existentes.

- [ ] **Step 1: Write the failing Playwright test**

Create `frontend/e2e/advertise.spec.ts`. Adicionar o arquivo ao `testMatch` do project `catalog` em `frontend/playwright.config.ts`.

```ts
import { expect, test } from '@playwright/test'

const A = 'http://tenant-a.localhost:3000'

test('a landing do anúncio não vende busca nem faceta restrita', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${A}/divulgar`)
  await expect(page.getByRole('heading', { level: 1, name: 'Publique o seu link.' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Publicar um link' })).toHaveAttribute('href', '/cadastro')
  await expect(page.getByText('Publicar é grátis.')).toBeVisible()
  const html = await page.content()
  expect(html).not.toMatch(/adulto|apostas|ganhar dinheiro|onlyfans|fansly|fatal model|privacy/i)
  expect(html).not.toContain('href="/busca"')
  expect(html).not.toContain('href="/nicho/')
  expect(html).not.toContain('href="/rede/')
  const mark = page.getByRole('link', { name: 'Home' })
  await expect(mark).toHaveAttribute('href', '/divulgar')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
  expect(overflow).toBe(false)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test e2e/advertise.spec.ts --project=catalog` from `frontend`
Expected: FAIL, 404 ou heading ausente

- [ ] **Step 3: Implement the page, the middleware header and the layout branch**

Seguir as interfaces desta task. Não importar `HomeExplore`.

- [ ] **Step 4: Run unit and Playwright**

Run: `npx vitest run src/domain/advertise.test.ts` and `npx playwright test e2e/advertise.spec.ts --project=catalog` from `frontend`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/divulgar frontend/src/middleware.ts frontend/src/app/layout.tsx frontend/e2e/advertise.spec.ts frontend/playwright.config.ts
git commit -m "feat: abre a landing de quem publica um link"
```

### Task 3: Chip da home sem corte

**Files:**
- Modify: `frontend/src/app/globals.css` em `.facet-line`
- Test: o mesmo spec Playwright, novo teste

- [ ] **Step 1: Write the failing test**

No `advertise.spec.ts`, outro `test`:

```ts
test('a home em 390px mostra o nicho inteiro e não rola para o lado', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${A}/`)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
  expect(overflow).toBe(false)
  const clipped = await page.evaluate(() => {
    return [...document.querySelectorAll('.facet-line .facet')].some((node) => {
      const box = node.getBoundingClientRect()
      return box.right > document.documentElement.clientWidth + 1 || box.left < -1
    })
  })
  expect(clipped).toBe(false)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test e2e/advertise.spec.ts --project=catalog` from `frontend`
Expected: FAIL no teste da home se algum chip sair da viewport. Se o seed do E2E não tiver chip longo e o teste passar à toa, acrescentar no teste a asserção de que `.facet-line` computado tem `flex-wrap: wrap` em viewport de 390. Isso falha com o CSS atual `nowrap`.

- [ ] **Step 3: Write minimal implementation**

Dentro de `@media (width < 720px)`, `.facet-line` fica `flex-wrap: wrap` e `overflow-x: visible`. Acima de 720px o scroll horizontal com barra escondida pode permanecer. Não usar `overflow-x: hidden` no `body` para mascarar o corte.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx playwright test e2e/advertise.spec.ts --project=catalog` from `frontend`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/globals.css frontend/e2e/advertise.spec.ts
git commit -m "fix: impede o corte dos nichos no mobile"
```

### Task 4: Confirmação da etapa

- [ ] **Step 1: Run the frontend unit file and the advertise Playwright file**

Run from `frontend`:

```bash
npx vitest run src/domain/advertise.test.ts
npx playwright test e2e/advertise.spec.ts --project=catalog
```

Expected: both PASS. Se o Playwright falhar por porta ocupada ou Docker parado, corrigir o ambiente e rodar de novo. Não encerrar a etapa com falha.

- [ ] **Step 2: Commit only if the confirmation run changed files**

Não criar commit vazio.
