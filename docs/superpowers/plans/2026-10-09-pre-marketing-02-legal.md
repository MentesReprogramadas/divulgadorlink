# Páginas legais Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Privacidade e termos existem, descrevem só o que o código faz, e o cadastro aponta para eles.

**Architecture:** Duas páginas servidor em `frontend/src/app/privacidade/page.tsx` e `frontend/src/app/termos/page.tsx`. O texto mora em `frontend/src/domain/legal.ts` para o Vitest ler sem renderizar. O e-mail de contato é `process.env.LEGAL_CONTACT_EMAIL`, opcional. Sem a variável, o texto não inventa endereço.

**Tech Stack:** Next.js 15, Vitest, Playwright.

## Global Constraints

- Não prometer job de apagar pedido aos 5 anos.
- Dizer que analytics de sessão dura 12 meses e que a exclusão da conta anonimiza como em `docs/superpowers/specs/2026-09-29-lgpd.md`.
- Dizer que publicar é grátis e que destaque é pago só com link já publicado.
- Dizer que o envio passa por análise humana e pode ser recusado.
- Em privacidade e em termos, dizer que o Tem Link Aqui não controla o conteúdo, a oferta nem o que acontece depois que a pessoa abre o link, e que esse destino está fora da jurisdição da plataforma.
- Identificar o operador como `CONTAVERA SOLUCOES INTELIGENTES LTDA`, CNPJ `66.421.121/0001-15`. Contato: `comercial@contavera.com`.
- Não publicar logradouro, número, complemento, bairro, cidade, UF, CEP nem telefone. Sem foro.
- `robots` `index,follow` nas duas páginas. Elas entram no array estático do sitemap do frontend só se o sitemap deixar de ser 100% dinâmico. Não duplicar URL: o sitemap dinâmico ganha as duas entradas em `backend/src/http/sitemap-index.ts`, sempre, com `updatedAt` fixo `2026-10-09T00:00:00.000Z`, não `new Date()`.

---

### Task 1: Texto legal testável

**Files:**
- Create: `frontend/src/domain/legal.ts`
- Test: `frontend/src/domain/legal.test.ts`

**Interfaces:**
- Consumes: nada
- Produces: `legalPages(contact: string | null): { privacy: string; terms: string }`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { legalPages } from './legal'

describe('texto legal', () => {
  const pages = legalPages('contato@example.com')

  it('não promete expurgo de pagamento', () => {
    expect(pages.privacy).not.toMatch(/apagamos pedidos/i)
    expect(pages.privacy).toContain('12 meses')
    expect(pages.privacy).toContain('contato@example.com')
  })

  it('identifica a empresa e não publica o endereço', () => {
    for (const page of [pages.privacy, pages.terms]) {
      expect(page).toContain('CONTAVERA SOLUCOES INTELIGENTES LTDA')
      expect(page).toContain('66.421.121/0001-15')
      expect(page).toContain('comercial@contavera.com')
      expect(page).not.toMatch(/\d{5}-?\d{3}/)
      expect(page).not.toMatch(/\(\d{2}\)\s*\d/)
    }
  })

  it('diz que publicar é grátis e que a análise é humana', () => {
    expect(pages.terms).toContain('Publicar é grátis')
    expect(pages.terms).toContain('análise humana')
    expect(pages.terms).toContain('destaque')
  })

  it('tira o destino do link da jurisdição da plataforma', () => {
    expect(pages.terms).toContain('fora da jurisdição')
    expect(pages.privacy).toContain('fora da jurisdição')
    expect(pages.terms).toContain('não controlamos')
    expect(pages.privacy).toContain('não controlamos')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/legal.test.ts` from `frontend`
Expected: FAIL

- [ ] **Step 3: Write the text functions**

`legalPages` devolve duas strings em português com as frases exigidas pelo teste e pelo spec de LGPD: e-mail e telefone do usuário enquanto a conta existir, senha só como hash, analytics sem IP, moderação invisível na página pública, exclusão anonimiza, pedido permanece sem identificador pessoal. As duas páginas nomeiam `CONTAVERA SOLUCOES INTELIGENTES LTDA`, CNPJ `66.421.121/0001-15` e o contato `comercial@contavera.com`. Termos: o que pode ser enviado (URL https pública), o que pode ser recusado, cota de 4 envios ocupando vaga ao mesmo tempo, proibição de conteúdo ilegal. Sem foro e sem endereço físico.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/legal.test.ts` from `frontend`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/domain/legal.ts frontend/src/domain/legal.test.ts
git commit -m "test: fixa o que a política pode prometer"
```

### Task 2: Rotas, cadastro e sitemap

**Files:**
- Create: `frontend/src/app/privacidade/page.tsx`
- Create: `frontend/src/app/termos/page.tsx`
- Modify: `frontend/src/app/cadastro/page.tsx`
- Modify: `backend/src/http/sitemap-index.ts`
- Test: `backend/src/http/sitemap-index` via o spec já existente de sitemap, ou um teste novo ao lado de `indexableEntries` se a função for pura. Se `entriesFrom` não estiver exportada, exportar só para teste não é obrigatório: acrescentar as duas paths no retorno de `entriesFrom` e cobrir com teste de unidade extraindo a lista estática.

**Interfaces:**
- Consumes: `legalPages`
- Produces: `GET /privacidade` e `GET /termos` 200; cadastro contém os dois hrefs

- [ ] **Step 1: Write the failing Playwright test**

`frontend/e2e/legal.spec.ts`, incluído no `testMatch` do project `catalog`.

```ts
import { expect, test } from '@playwright/test'

const A = 'http://tenant-a.localhost:3000'

test('cadastro aponta para privacidade e termos', async ({ page }) => {
  await page.goto(`${A}/cadastro`)
  await expect(page.getByRole('link', { name: 'Privacidade' })).toHaveAttribute('href', '/privacidade')
  await expect(page.getByRole('link', { name: 'Termos' })).toHaveAttribute('href', '/termos')
  await page.goto(`${A}/privacidade`)
  await expect(page.getByRole('heading', { level: 1, name: 'Privacidade' })).toBeVisible()
  await expect(page.getByText('12 meses')).toBeVisible()
  await page.goto(`${A}/termos`)
  await expect(page.getByRole('heading', { level: 1, name: 'Termos' })).toBeVisible()
  await expect(page.getByText('Publicar é grátis')).toBeVisible()
  await expect(page.getByText('66.421.121/0001-15')).toBeVisible()
  const body = await page.locator('body').innerText()
  expect(body).not.toMatch(/\d{5}-?\d{3}/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test e2e/legal.spec.ts --project=catalog` from `frontend`
Expected: FAIL, 404

- [ ] **Step 3: Implement pages and the signup links**

As páginas renderizam `legalPages('comercial@contavera.com')`. Não ler endereço de ambiente. O cadastro ganha, antes do botão, o texto “Ao criar a conta você concorda com os Termos e a Privacidade.” com dois links. O botão continua habilitado: não adicionar checkbox obrigatório nesta etapa. A exigência da auditoria é o link visível, não um gate a mais.

Em `entriesFrom`, depois da home, inserir `{ path: '/privacidade', updatedAt: '2026-10-09T00:00:00.000Z' }` e o mesmo para `/termos`.

- [ ] **Step 4: Run tests**

Run from `frontend`: `npx vitest run src/domain/legal.test.ts` and `npx playwright test e2e/legal.spec.ts --project=catalog`
Run from `backend` the vitest file that covers sitemap entries. Ajustar a expectativa se algum teste contava o número exato de URLs e agora são duas a mais.
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/privacidade frontend/src/app/termos frontend/src/app/cadastro/page.tsx frontend/e2e/legal.spec.ts frontend/playwright.config.ts backend/src/http/sitemap-index.ts
git commit -m "feat: publica privacidade e termos no cadastro"
```

### Task 3: Confirmação da etapa

- [ ] **Step 1: Re-run the legal unit test and the legal Playwright file**

Expected: PASS. Falha de ambiente entra no escopo: Docker e portas, depois repetir. Não seguir para a etapa 3 com este teste vermelho.
