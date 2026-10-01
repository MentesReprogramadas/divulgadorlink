# Vitrine, analytics e qualidade — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Medir impressão e clique sem inflar, montar o design system, as telas reais, o E2E no browser, a suíte de segurança e o CI.

**Architecture:** A superfície viaja da listagem até `/go` num parâmetro assinado. A página não inventa componente. O E2E atravessa Next, API e Postgres. Provedor externo é adapter de teste.

**Tech Stack:** Next.js 15.3.8, React 19, Tailwind 4, Playwright, Vitest, GitHub Actions.

## Global Constraints

Herdadas do mapa. Analytics não guarda IP nem user-agent. Dono e admin não contam. Home de nicho e home de rede gravam `NICHE`. Não há job que apague evento com 12 meses.

---

### Task 1: Analytics

**Files:**
- Create: `backend/src/use-cases/@Analytics/record-event.ts`
- Test: `backend/src/use-cases/@Analytics/record-event.spec.ts`
- Modify: `backend/prisma/schema.prisma`

**Interfaces:**
- Consumes: cookie de sessão opaco
- Produces: `shouldCount`. Único em `(sessionId, linkId, surface, day, kind)`.

- [x] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { ctr, shouldCount, surfaceFor } from '@/use-cases/@Analytics/record-event'

describe('analytics', () => {
  it('não conta dono, admin nem repetição', () => {
    expect(shouldCount({ viewer: 'OWNER', duplicate: false })).toBe(false)
    expect(shouldCount({ viewer: 'ADMIN', duplicate: false })).toBe(false)
    expect(shouldCount({ viewer: 'VISITOR', duplicate: true })).toBe(false)
    expect(shouldCount({ viewer: 'VISITOR', duplicate: false })).toBe(true)
  })

  it('home de rede é superfície NICHE', () => {
    expect(surfaceFor('network-home')).toBe('NICHE')
    expect(surfaceFor('niche-home')).toBe('NICHE')
  })

  it('CTR usa a mesma chave', () => {
    expect(ctr(1, 4)).toBe(25)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/use-cases/@Analytics/record-event.spec.ts`
Expected: FAIL

- [x] **Step 3: Write minimal implementation**

```ts
export function shouldCount(input: { viewer: 'OWNER' | 'ADMIN' | 'VISITOR'; duplicate: boolean }): boolean {
  if (input.viewer !== 'VISITOR') return false
  return !input.duplicate
}

export function surfaceFor(origin: 'search' | 'niche-home' | 'network-home' | 'home' | 'organic'): 'SEARCH' | 'NICHE' | 'HOME' | 'ORGANIC' {
  if (origin === 'niche-home' || origin === 'network-home') return 'NICHE'
  if (origin === 'search') return 'SEARCH'
  if (origin === 'home') return 'HOME'
  return 'ORGANIC'
}

export function ctr(clicks: number, impressions: number): number {
  if (impressions === 0) return 0
  return (clicks / impressions) * 100
}
```

`AnalyticsEvent.day` é o relógio dos 12 meses. Não há `userId` nem coluna `retentionUntil`. Este plano não cria o job. A coluna não tem IP nem user-agent. Conflito da chave única é sucesso. O redirect de `/go` acontece mesmo assim. O parâmetro de superfície é assinado pela API na hora da listagem. A página não deixa o browser escolher a superfície à vontade.

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- src/use-cases/@Analytics/record-event.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/use-cases/@Analytics backend/prisma
git commit -m "feat: impressão e clique deduplicados por sessão"
```

---

### Task 2: Design system

**Files:**
- Create: `frontend/src/styles/tokens.css`
- Create: `frontend/src/components/ui/button.tsx`
- Create: `frontend/src/components/feedback/empty-state.tsx`
- Create: `frontend/src/components/feedback/error-state.tsx`
- Test: `frontend/src/components/ui/button.test.tsx`

**Interfaces:**
- Consumes: nada de domínio financeiro da Contavera
- Produces: tokens e os componentes que a Task 3 importa. Página não declara um segundo botão.

- [x] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react'
import { Button } from './button'

it('renderiza o botão do sistema', () => {
  render(<Button variant="primary">Acessar</Button>)
  expect(screen.getByRole('button', { name: 'Acessar' })).toBeTruthy()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/ui/button.test.tsx`
Expected: FAIL

- [x] **Step 3: Write minimal implementation**

`tokens.css` define espaço, tipo, raio, sombra, breakpoint e cor. `Button` só usa essas variáveis e `variant` `primary | secondary | ghost`. `EmptyState` e `ErrorState` cobrem vazio, erro e retry. Os outros primitivos (Input, Select, Dialog, Toast, Card, Table, Pagination, Form, Loading, Skeleton) nascem no mesmo pacote `components/ui` ou `components/feedback` antes da Task 3 importá-los. Cada um recebe variante pelos tokens. Não copiar tela da Contavera.

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/ui/button.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components frontend/src/styles
git commit -m "feat: design system com tokens"
```

---

### Task 3: Telas

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/src/app/page.tsx`
- Create: `frontend/src/app/busca/page.tsx`
- Create: `frontend/src/app/nicho/[slug]/page.tsx`
- Create: `frontend/src/app/rede/[slug]/page.tsx`
- Create: `frontend/src/app/link/[id]/page.tsx`
- Create: `frontend/src/app/painel/page.tsx`
- Create: `frontend/src/app/admin/page.tsx`
- Test: `frontend/src/app/page.test.tsx`

**Interfaces:**
- Consumes: rotas dos planos 1 a 5 e os componentes da Task 2
- Produces: home sem `requiresAge`. Busca pede idade antes de desenhar. Checkout mostra o preço que o backend devolveu. Combinação inexistente mostra indisponível, sem trocar o produto.

- [x] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react'
import { HomePage } from './page'

it('não desenha nicho com idade na home', () => {
  render(<HomePage links={[{ id: '1', name: 'A', requiresAge: false }, { id: '2', name: 'B', requiresAge: true }]} />)
  expect(screen.queryByText('B')).toBeNull()
  expect(screen.getByText('A')).toBeTruthy()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/page.test.tsx`
Expected: FAIL

- [x] **Step 3: Write minimal implementation**

`package.json` fixa `next@15.3.8`, `react@19`, Tailwind 4, Radix, react-hook-form, Zod, TanStack Query. Fontes Geist e Plus Jakarta Sans. As rotas e os rótulos são os dos specs Playwright desta mesma pasta: `/cadastro`, `/login`, `/painel`, `/painel/verificar`, `/painel/links/novo`, `/painel/links/receitas/destaque`, `/admin/moderacao`, `/busca`, `/link/[id]`. Sessão ausente em rota privada mostra o formulário de login. Home filtra `requiresAge`. Página do link `UNAVAILABLE` tem o heading `Link indisponível` e não renderiza Acessar. Acessar aponta para `/go/:linkId`. Painel do dono mostra período, valor pago, dias restantes, impressão, clique e CTR por superfície, com os textos `Ativado`, `Expira`, `N impressão` e `N clique`. Conta `BANNED` vê `Conta suspensa` e não vê `Novo link` nem `Renovar 28 dias`. Admin de `REFUND_FAILED` mostra pedido, usuário, valor, ids, tentativas, erro do gateway e horário. O único botão financeiro dessa fila chama a rota que marca `REFUNDED`. Não há botão de ativar promoção tardia nem de simular webhook.

- [x] **Step 4: Run test to verify it passes**

Run: `npm test` em `frontend` e `npm test` em `backend`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat: vitrine, painel e admin"
```

---

### Task 4: Playwright

**Files:**
- Create: `frontend/playwright.config.ts`
- Create: `frontend/e2e/auth.spec.ts`
- Create: `frontend/e2e/link.spec.ts`
- Create: `frontend/e2e/search.spec.ts`
- Create: `frontend/e2e/promotion.spec.ts`
- Create: `frontend/e2e/security.spec.ts`

**Interfaces:**
- Consumes: API, worker, Next, Postgres e Redis de teste. Adapters de Stripe, Woovi e OpenAI de teste, mesma interface.
- Produces: `npm run test:e2e`. O teste usa o browser e lê o banco. Não chama use case direto.

Contas semeadas no banco de teste, antes do browser: `ana@example.com` sem confirmar; `bia@example.com` com e-mail e telefone confirmados, no tenant `temlinkaqui.com`; `admin@example.com` com papel `ADMIN` nesse tenant; `cid@example.com` banida; `dora@example.com` no host `outro.example`. Não há botão de simular pagamento. O webhook do teste chama `POST /api/v1/payments/woovi/webhook` com a assinatura do adapter de teste. A UI só mostra o que a API devolveu.

- [x] **Step 1: Write the failing test**

`frontend/e2e/auth.spec.ts` cobre cadastro, login e confirmação:

```ts
import { expect, test } from '@playwright/test'

test('cadastro deixa o envio desligado até confirmar os dois', async ({ page }) => {
  await page.goto('/cadastro')
  await page.getByLabel('Nome').fill('Ana')
  await page.getByLabel('E-mail').fill('ana@example.com')
  await page.getByLabel('Telefone').fill('11999999999')
  await page.getByLabel('Senha').fill('senha-forte-1')
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page.getByText('Confirme o e-mail e o telefone para enviar um link')).toBeVisible()
  await page.goto('/painel/links/novo')
  await expect(page.getByRole('button', { name: 'Enviar' })).toBeDisabled()
})

test('login da conta confirmada abre o painel', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill('bia@example.com')
  await page.getByLabel('Senha').fill('senha-forte-1')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/painel/)
  await expect(page.getByRole('link', { name: 'Novo link' })).toBeVisible()
})

test('confirma e-mail e telefone e então habilita o envio', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill('ana@example.com')
  await page.getByLabel('Senha').fill('senha-forte-1')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.goto('/painel/verificar')
  await page.getByLabel('Código do e-mail').fill('000001')
  await page.getByRole('button', { name: 'Confirmar e-mail' }).click()
  await page.getByLabel('Código do telefone').fill('000002')
  await page.getByRole('button', { name: 'Confirmar telefone' }).click()
  await page.goto('/painel/links/novo')
  await expect(page.getByRole('button', { name: 'Enviar' })).toBeEnabled()
})
```

O código `000001` / `000002` é o valor que o adapter de e-mail e de SMS de teste entrega. Produção gera outro código. A tela não mostra o código.

`frontend/e2e/link.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

async function loginBia(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill('bia@example.com')
  await page.getByLabel('Senha').fill('senha-forte-1')
  await page.getByRole('button', { name: 'Entrar' }).click()
}

test('formulário inválido não envia', async ({ page }) => {
  await loginBia(page)
  await page.goto('/painel/links/novo')
  await page.getByLabel('URL').fill('http://inseguro.example')
  await page.getByRole('button', { name: 'Enviar' }).click()
  await expect(page.getByText('Informe uma URL https')).toBeVisible()
  await expect(page.getByText('Em revisão')).toHaveCount(0)
})

test('preview mostra a URL canônica antes do envio', async ({ page }) => {
  await loginBia(page)
  await page.goto('/painel/links/novo')
  await page.getByLabel('URL').fill('HTTPS://t.me/Canal/')
  await expect(page.getByText('https://t.me/Canal')).toBeVisible()
})

test('passe da IA publica e a página pública mostra o nome', async ({ page }) => {
  await loginBia(page)
  await page.goto('/painel/links/novo')
  await page.getByLabel('Nome').fill('Receitas')
  await page.getByLabel('Descrição').fill('bolos')
  await page.getByLabel('URL').fill('https://t.me/receitas')
  await page.getByLabel('Rede').selectOption({ label: 'Telegram' })
  await page.getByLabel('Nicho').selectOption({ label: 'Jogos' })
  await page.getByRole('button', { name: 'Enviar' }).click()
  await expect(page.getByText('Publicado')).toBeVisible()
  await page.goto('/link/receitas')
  await expect(page.getByRole('heading', { name: 'Receitas' })).toBeVisible()
})

test('falha da IA deixa em revisão e o admin rejeita', async ({ page }) => {
  await loginBia(page)
  await page.goto('/painel/links/novo')
  await page.getByLabel('Nome').fill('Duvida')
  await page.getByLabel('Descrição').fill('sem passe')
  await page.getByLabel('URL').fill('https://t.me/duvida')
  await page.getByLabel('Rede').selectOption({ label: 'Telegram' })
  await page.getByLabel('Nicho').selectOption({ label: 'Jogos' })
  await page.getByRole('button', { name: 'Enviar' }).click()
  await expect(page.getByText('Em revisão')).toBeVisible()
  await page.goto('/login')
  await page.getByLabel('E-mail').fill('admin@example.com')
  await page.getByLabel('Senha').fill('senha-forte-1')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.goto('/admin/moderacao')
  await page.getByRole('button', { name: 'Rejeitar' }).click()
  await expect(page.getByText('Rejeitado')).toBeVisible()
})

test('contestação única volta para a fila e não publica', async ({ page }) => {
  await loginBia(page)
  await page.goto('/painel')
  await page.getByRole('link', { name: 'Contestar' }).click()
  await page.getByLabel('Explique o que aconteceu').fill('foi engano')
  await page.getByRole('button', { name: 'Enviar contestação' }).click()
  await expect(page.getByText('Em revisão')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Contestar' })).toHaveCount(0)
})
```

O adapter de IA de teste publica quando o nome é `Receitas` e manda para o admin quando o nome é `Duvida`. Isso é o adapter, não um `if` no use case.

`frontend/e2e/search.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

test('busca de nome livre lista o orgânico e não repete o patrocinado', async ({ page }) => {
  await page.goto('/busca?q=receitas')
  const sponsored = page.getByRole('region', { name: 'Patrocinados' })
  const organic = page.getByRole('region', { name: 'Resultados' })
  await expect(sponsored.getByRole('link', { name: 'Receitas' })).toBeVisible()
  await expect(organic.getByRole('link', { name: 'Receitas' })).toHaveCount(0)
})

test('página pública não conta impressão de novo ao recarregar e o Acessar redireciona uma vez', async ({ page }) => {
  await page.goto('/link/receitas?surface=ORGANIC')
  await page.reload()
  await page.getByRole('link', { name: 'Acessar' }).click()
  await expect(page).toHaveURL(/t\.me\/receitas/)
  await page.goto('/painel')
  await page.getByLabel('E-mail').fill('bia@example.com')
  await page.getByLabel('Senha').fill('senha-forte-1')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByText('1 impressão')).toBeVisible()
  await expect(page.getByText('1 clique')).toBeVisible()
})
```

`frontend/e2e/promotion.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

test('checkout mostra o preço do backend e recusa SEARCH_HOME', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill('bia@example.com')
  await page.getByLabel('Senha').fill('senha-forte-1')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.goto('/painel/links/receitas/destaque')
  await page.getByRole('checkbox', { name: 'Busca' }).check()
  await page.getByRole('checkbox', { name: 'Home' }).check()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByText('Combinação não está disponível')).toBeVisible()
  await page.getByRole('checkbox', { name: 'Home' }).uncheck()
  await page.getByRole('radio', { name: '7 dias' }).check()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByText('R$ 7,90')).toBeVisible()
})

test('webhook no prazo ativa e mostra a data de ativação', async ({ page, request }) => {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill('bia@example.com')
  await page.getByLabel('Senha').fill('senha-forte-1')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.goto('/painel/links/receitas/destaque')
  await page.getByRole('checkbox', { name: 'Busca' }).check()
  await page.getByRole('radio', { name: '7 dias' }).check()
  await page.getByRole('button', { name: 'Pagar com Pix' }).click()
  const orderId = await page.getByLabel('Pedido').innerText()
  const webhook = await request.post('/api/v1/payments/woovi/webhook', {
    data: { event: 'OPENPIX:CHARGE_COMPLETED', correlationID: orderId },
    headers: { 'x-test-signature': 'test-adapter' },
  })
  expect(webhook.ok()).toBeTruthy()
  await page.reload()
  await expect(page.getByText('Ativo')).toBeVisible()
})

test('cobrança vencida fica expirada e não ativa', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill('bia@example.com')
  await page.getByLabel('Senha').fill('senha-forte-1')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.goto('/painel/pedidos/pix-curto')
  await expect(page.getByText('Expirado')).toBeVisible()
  await expect(page.getByText('Ativo')).toHaveCount(0)
})

test('renovar conserva a data de ativação e empurra o fim', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill('bia@example.com')
  await page.getByLabel('Senha').fill('senha-forte-1')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.goto('/painel/links/receitas/destaque')
  const activated = await page.getByLabel('Ativado').innerText()
  const expires = await page.getByLabel('Expira').innerText()
  await page.getByRole('button', { name: 'Renovar 28 dias' }).click()
  await page.getByRole('button', { name: 'Pagar com Pix' }).click()
  await expect(page.getByLabel('Ativado')).toHaveText(activated)
  await expect(page.getByLabel('Expira')).not.toHaveText(expires)
})
```

O pedido `pix-curto` é criado pelo seed de teste com `pixExpiresAt` no passado. Produção continua com 1800 segundos na Woovi. A tela mostra o instante que a API devolveu, não a frase fixa "30 minutos".

`frontend/e2e/security.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

test('conta banida vê o painel sem ação de escrita', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill('cid@example.com')
  await page.getByLabel('Senha').fill('senha-forte-1')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByText('Conta suspensa')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Novo link' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Renovar 28 dias' })).toHaveCount(0)
})

test('tenant A não vê o link do tenant B', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill('bia@example.com')
  await page.getByLabel('Senha').fill('senha-forte-1')
  await page.getByRole('button', { name: 'Entrar' }).click()
  const response = await page.goto('/link/do-outro-tenant')
  expect(response?.status()).toBe(404)
})

test('usuário comum não abre a moderação', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill('bia@example.com')
  await page.getByLabel('Senha').fill('senha-forte-1')
  await page.getByRole('button', { name: 'Entrar' }).click()
  const response = await page.goto('/admin/moderacao')
  expect(response?.status()).toBe(404)
  await expect(page.getByRole('button', { name: 'Rejeitar' })).toHaveCount(0)
})

test('admin abre a fila do próprio tenant', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill('admin@example.com')
  await page.getByLabel('Senha').fill('senha-forte-1')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.goto('/admin/moderacao')
  await expect(page.getByRole('heading', { name: 'Moderação' })).toBeVisible()
})
```

`frontend/e2e/states.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

test('busca vazia, erro com retry, link indisponível e loading', async ({ page }) => {
  await page.goto('/busca?q=nada-aqui')
  await expect(page.getByText('Nenhum link encontrado')).toBeVisible()
  await page.goto('/busca?q=falha')
  await expect(page.getByRole('alert')).toBeVisible()
  await page.getByRole('button', { name: 'Tentar de novo' }).click()
  await page.goto('/link/indisponivel')
  await expect(page.getByRole('heading', { name: 'Link indisponível' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Acessar' })).toHaveCount(0)
  await page.goto('/busca?q=lento')
  await expect(page.getByRole('status', { name: 'Carregando' })).toBeVisible()
})

for (const width of [1280, 768, 390]) {
  test(`sem rolagem horizontal em ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    for (const path of ['/', '/busca?q=receitas', '/link/receitas', '/painel/links/receitas/destaque']) {
      await page.goto(path)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
      expect(overflow).toBe(false)
    }
  })
}
```

`q=falha` e `q=lento` são respostas do adapter de teste da busca, não cópia fixa na página. A página renderiza o estado que a API devolveu: vazio, erro ou loading.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:e2e -- e2e/auth.spec.ts`
Expected: FAIL até a UI e a API existirem.

- [x] **Step 3: Write minimal implementation**

`playwright.config.ts` sobe API, worker e Next contra o compose de teste. Webhook de teste usa adapter que implementa `PaymentGateway`. O use case não ganha `if (test)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:e2e`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/playwright.config.ts frontend/e2e
git commit -m "test: e2e Playwright dos fluxos críticos"
```

---

### Task 5: Suíte de segurança da API

**Files:**
- Create: `backend/src/http/security.spec.ts`
- Modify: `backend/src/app.ts`

**Interfaces:**
- Consumes: `authorize`, `assertPublicHttps`, webhook
- Produces: a suíte falha se qualquer caso abaixo passar como sucesso indevido.

- [x] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { app } from '@/app'

describe('segurança', () => {
  it('não cria admin pelo corpo do cadastro', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      headers: { host: 'temlinkaqui.com' },
      payload: { name: 'Ana', email: 'ana@example.com', phone: '+5511999999999', password: 'senha-forte-1', role: 'ADMIN' },
    })
    expect(response.statusCode).toBe(201)
    expect(response.json().role).toBe('USER')
  })

  it('não redireciona /go para um host da query', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/go/link-publicado?to=https://evil.example',
    })
    expect(response.headers.location ?? '').not.toContain('evil.example')
  })
})
```

A mesma suíte inclui estes casos, com `app.inject` e host `temlinkaqui.com`:

```ts
it('rota privada sem JWT responde 401', async () => {
  const response = await app.inject({ method: 'POST', url: '/api/v1/links', headers: { host: 'temlinkaqui.com' }, payload: {} })
  expect(response.statusCode).toBe(401)
})

it('usuário não altera link de outro e tenant A não lê link do tenant B', async () => {
  const otherUser = await app.inject({ method: 'PATCH', url: '/api/v1/links/do-bia', headers: { host: 'temlinkaqui.com', authorization: 'Bearer token-de-cid' }, payload: { name: 'trocado' } })
  expect(otherUser.statusCode).not.toBe(200)
  const otherTenant = await app.inject({ method: 'GET', url: '/api/v1/links/do-tenant-b', headers: { host: 'temlinkaqui.com', authorization: 'Bearer token-da-bia' } })
  expect(otherTenant.statusCode).not.toBe(200)
})

it('ignora tenantId do corpo', async () => {
  const response = await app.inject({ method: 'POST', url: '/api/v1/links', headers: { host: 'temlinkaqui.com', authorization: 'Bearer token-da-bia' }, payload: { tenantId: 'tenant-b', url: 'https://t.me/livre', name: 'Livre', description: 'ok', networkId: 'telegram', nicheId: 'jogos' } })
  expect(response.statusCode).not.toBe(201)
  expect(JSON.stringify(response.json())).not.toContain('tenant-b')
})

it('webhook sem assinatura não muda o pedido', async () => {
  const before = await app.inject({ method: 'GET', url: '/api/v1/admin/orders/pedido-1', headers: { host: 'temlinkaqui.com', authorization: 'Bearer token-admin' } })
  const webhook = await app.inject({ method: 'POST', url: '/api/v1/payments/stripe/webhook', headers: { host: 'temlinkaqui.com' }, payload: { type: 'payment_intent.succeeded' } })
  expect(webhook.statusCode).toBe(400)
  const after = await app.inject({ method: 'GET', url: '/api/v1/admin/orders/pedido-1', headers: { host: 'temlinkaqui.com', authorization: 'Bearer token-admin' } })
  expect(after.json()).toEqual(before.json())
})

it('não busca 127.0.0.1 e não estoura a página', async () => {
  const local = await app.inject({ method: 'POST', url: '/api/v1/links', headers: { host: 'temlinkaqui.com', authorization: 'Bearer token-da-bia' }, payload: { url: 'https://127.0.0.1', name: 'Local', description: 'x', networkId: 'site', nicheId: 'jogos' } })
  expect(local.statusCode).toBe(422)
  const huge = await app.inject({ method: 'POST', url: '/api/v1/links', headers: { host: 'temlinkaqui.com', authorization: 'Bearer token-da-bia' }, payload: { url: 'https://t.me/x', name: 'n'.repeat(2_000_000), description: 'x', networkId: 'telegram', nicheId: 'jogos' } })
  expect(huge.statusCode).toBe(413)
})
```

O sexto login na janela de 60 minutos responde 429. O 500 de produção é `{ code: "internal_error", request_id }` e o corpo não contém `prisma` nem `at `. O `GET` público do link não contém e-mail, hash, sinal de moderação nem id de pagamento. O cookie `refreshToken` sai `HttpOnly`, `Secure` quando `NODE_ENV=production`, `SameSite=Lax`. A resposta CORS com `credentials` não usa `*`. O segundo POST do mesmo `eventId` não chama `scheduleRetry` de novo: isso já está em `payments.spec.ts` e esta suíte repete o POST HTTP.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/http/security.spec.ts`
Expected: FAIL

- [x] **Step 3: Write minimal implementation**

Zod de cadastro sem `role`. Helmet, CORS com a lista de hosts do tenant, body limit, rate limit em auth, confirmação e busca. `/go` só usa a URL gravada no link.

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- src/http/security.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/http/security.spec.ts backend/src/app.ts
git commit -m "test: suíte de segurança da API"
```

---

### Task 6: CI

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: os testes dos cinco planos anteriores e deste
- Produces: pipeline que falha o merge se um passo falhar.

Estado medido em 2026-09-29, com `vitest@^2.1.5` e sem `vite` direto: `npm audit --audit-level=high` sai 1.

Achados que seguram o gate:

- HIGH `GHSA-fx2h-pf6j-xcff`, vite `<=6.4.2`, bypass de `server.fs.deny` no Windows. Chega por vitest 2.
- CRITICAL `GHSA-5xrq-8626-4rwp`, vitest `<3.2.6`, leitura e execução de arquivo quando a UI do Vitest escuta. A dependência direta é `vitest@^2.1.5`.

Os dois são dependência de desenvolvimento. O gate não abre exceção por isso. Não há `.nsprc`, `audit-level` mais baixo, nem `continue-on-error`.

Correção desta task, antes do workflow ser aceito:

1. `vitest` passa de `^2.1.5` para `5.0.2`. O npm aponta essa versão como correção da crítica e do mocker.
2. `vite` entra como devDependency direta em `6.4.3`. Vitest 5 aceita `^6.4.0`, e `6.4.0`–`6.4.2` ainda estão dentro do HIGH. `6.4.3` é a primeira 6.x fora do intervalo.
3. Rodar de novo os 11 testes que já passam. Se a major quebrar teste, o teste é ajustado nesta task. A regra de pagamento não muda.
4. `npm audit --audit-level=high` precisa sair 0. Se ainda houver HIGH ou CRITICAL, a task continua aberta. Não se troca o gate por uma exceção.

Custo: o runner deixa de ser o Vitest 2 da Contavera. O desvio é o advisory, não uma regra de produto.

- [x] **Step 1: Write the failing test**

O artefato é o workflow mais o `package.json` acima. A verificação local é: lint, typecheck, `npm test` no backend, `npm test` no frontend, `npm audit --audit-level=high` nos dois, Playwright, build.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm audit --audit-level=high` em `backend`, antes de mudar a versão.
Expected: exit 1, com `GHSA-fx2h-pf6j-xcff` e `GHSA-5xrq-8626-4rwp`.

- [x] **Step 3: Write minimal implementation**

```yaml
name: ci
on: [push, pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:pg16
        env: { POSTGRES_PASSWORD: divulgador, POSTGRES_USER: divulgador, POSTGRES_DB: divulgador }
        ports: ["5432:5432"]
      redis:
        image: redis:7
        ports: ["6379:6379"]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
        working-directory: backend
      - run: npm ci
        working-directory: frontend
      - run: npm run lint && npm run typecheck && npm test && npm audit --audit-level=high
        working-directory: backend
      - run: npm run lint && npm run typecheck && npm test && npm audit --audit-level=high
        working-directory: frontend
      - run: npm run test:e2e
        working-directory: frontend
      - run: npm run build
        working-directory: backend
      - run: npm run build
        working-directory: frontend
```

O YAML não contém segredo. Migration de teste roda antes do teste de HTTP. Não há passo que ignore falha.

- [ ] **Step 4: Run test to verify it passes**

A pipeline verde no commit da task. Localmente, a mesma ordem termina sem erro.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: lint, testes, e2e, audit e build"
```

## Gate deste plano

Repete a suíte inteira: unitário, HTTP, Playwright, segurança, audit e build. Log sem e-mail e sem telefone. Página pública sem dado do dono. Não existe job de limpeza de retenção. Problema relevante reabre a task. O plano não fecha com falha conhecida.

## Status de implementação

Reconciliado em 2026-09-30 (Task 10), contra o código e as suítes do mesmo dia: backend `npm test` 198/198 (50 arquivos), `test:pg` 30/30, frontend 7/7, Playwright 15/15 em duas execuções seguidas (uma terceira anterior teve 1 falha intermitente, ver plano 07), typecheck, lint, build e `npm audit --audit-level=high` sem vulnerabilidade nos dois workspaces.

Regra das marcas: Step 1 e Step 3 marcados quando o spec e a implementação declarados existem; Step 4 marcado quando o spec passa numa dessas suítes. Step 2 ("ver falhar") é histórico e não se prova retroativamente: fica `[ ]`. Step 5 (commit) não foi executado por instrução: fica `[ ]`. Nenhum histórico foi apagado.

| Task | Status | Evidência |
|---|---|---|
| Task 1: Analytics | PASS | `record-event.spec.ts`, `analytics.pg.spec.ts`; índice `(tenantId, linkId, day)` levou `totals` de 20 ms para 0,03 ms com 500k eventos |
| Task 2: Design system | PASS | `button.test.tsx` |
| Task 3: Telas | PASS | `page.test.tsx`; `/admin` virou `/admin/moderacao` e `/admin/estornos` |
| Task 4: Playwright | OPEN | Consolidado em `frontend/e2e/catalog.spec.ts` (15 testes), não nos 5 arquivos do plano. 15/15 nas duas últimas execuções; 1 falha intermitente anterior em `asBia` sem causa raiz. Step 4 fica `[ ]` |
| Task 5: Suíte de segurança da API | PASS | `http/security.spec.ts` |
| Task 6: CI | BLOCKED_EXTERNAL | `.github/workflows/ci.yml` existe e a mesma ordem passa localmente. `CI REMOTE EXECUTION REQUIRES PUSH/GITHUB` (`gh` ausente, sem push). Step 4 fica `[ ]` |
