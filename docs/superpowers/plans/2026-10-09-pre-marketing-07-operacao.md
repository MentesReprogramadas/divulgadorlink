# Operação, headers e retenção Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin recebe e-mail quando abre um caso, a resposta do site manda os headers de segurança sem quebrar o Stripe, e analytics com mais de 12 meses sai do banco.

**Architecture:** `notifyModeration` já existe para o dono. Um segundo envio, mesmo template curto, vai para cada admin do tenant com e-mail atual. Não há job `moderate-link`. Headers ficam em `frontend/next.config.ts` `headers()`. O expurgo é função pura de data mais um método no repositório, chamado no boot do worker uma vez por dia via fila já existente, não via `node-cron` novo. Pedido e pagamento não entram nesse delete.

**Tech Stack:** Next.js headers, Vitest, Playwright, Prisma.

## Global Constraints

- Não enfileirar `moderate-link`.
- Não apagar `Order`, `Payment`, `AuditLog` nem `User`.
- Apagar `AnalyticsEvent` com `day` anterior a 12 meses, em lotes de 1000, até zerar o lote.
- CSP permite `https://js.stripe.com` e `https://hooks.stripe.com` em script e frame. `connect-src` inclui `'self'` e `https://api.stripe.com`. O resto é `'self'`.
- HSTS: `max-age=31536000; includeSubDomains`. Não adicionar `preload` sem o item humano de www estar feito.
- `X-Frame-Options: DENY` quebra o iframe do Stripe. Não usar DENY. Usar `Content-Security-Policy: frame-ancestors 'none'` na página e `frame-src` permitindo Stripe. Não setar `X-Frame-Options` se o teste do checkout mostrar o iframe bloqueado. A confirmação é o teste, não o header pelo header.
- `Referrer-Policy: strict-origin-when-cross-origin`.
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
- `poweredByHeader: false` no `next.config.ts`.

---

### Task 1: Aviso ao admin

**Files:**
- Modify: `backend/src/adapters/notifications/email/templates.ts`
- Modify: `backend/src/http/controllers/@Links/routes.ts` depois de `ensureOpen` no create
- Test: `backend/src/adapters/notifications/email/templates.spec.ts` e um teste HTTP que o mailer de teste recebeu `kind: 'moderation-queue'`

**Interfaces:**
- Produces: `queueEmail(input: { brand: EmailBrand; linkName: string }): RenderedEmail` com assunto `${brand}: link para analisar`

O corpo diz o nome do link e a frase “Abra a fila de moderação.” Sem URL do link submetido, sem e-mail do dono, sem telefone.

Destinatários: usuários `ADMIN` do tenant cujo identifier de e-mail atual está confirmado. Zero admins: não lança erro, o envio do usuário segue 201. Falha de e-mail do admin não desfaz o link. Logar `notification.delivery` como o restante.

- [ ] **Step 1: Write the failing template test**

```ts
it('avisa a fila sem dado do dono', () => {
  const rendered = queueEmail({ brand: emailBrand({}), linkName: 'Grupo de jogos' })
  expect(rendered.subject).toContain('link para analisar')
  expect(rendered.text).toContain('Grupo de jogos')
  expect(rendered.text).not.toContain('@')
})
```

- [ ] **Step 2: Run and confirm FAIL**

- [ ] **Step 3: Implement template and the send after the case opens**

Reusar `sendQuiet` de `outbound-mail.ts`. Não criar provedor novo.

- [ ] **Step 4: Run template spec and links spec**

Expected: PASS. O teste de chaves do JSON do POST continua sem campo de e-mail.

- [ ] **Step 5: Commit**

```bash
git add backend/src/adapters/notifications backend/src/http/controllers/@Links/routes.ts
git commit -m "feat: avisa o admin quando um link entra na fila"
```

### Task 2: Headers

**Files:**
- Modify: `frontend/next.config.ts`
- Test: `frontend/e2e/security-headers.spec.ts`

```ts
test('a home manda os headers e não anuncia o Next', async ({ request }) => {
  const response = await request.get('http://tenant-a.localhost:3000/')
  const headers = response.headers()
  expect(headers['strict-transport-security']).toContain('max-age=31536000')
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
  expect(headers['permissions-policy']).toContain('camera=()')
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'")
  expect(headers['content-security-policy']).toContain('https://js.stripe.com')
  expect(headers['x-powered-by']).toBeUndefined()
})
```

- [ ] **Step 1: Write the failing Playwright test and add it to the catalog project**

- [ ] **Step 2: Run and confirm FAIL**

- [ ] **Step 3: Add `headers()` and `poweredByHeader: false`**

CSP em uma linha, sem report-only, porque o teste exige o header de enforcement. Se o teste de checkout existente falhar ao carregar o Stripe, alargar só `script-src`, `frame-src` e `connect-src` com o host que o teste mostrar. Não abrir `unsafe-eval` sem uma falha reproduzida do Stripe. `unsafe-inline` para script não entra. Se o Next exigir inline para o bootstrap e a home quebrar, a correção é nonce via middleware, não `unsafe-inline` amplo. Se o nonce estourar o tempo da etapa, registrar a falha no relatório humano como “CSP de script adiada” e manter os outros headers. Não é permitido marcar a task pronta com a home em branco.

- [ ] **Step 4: Run the header spec and `e2e/catalog.spec.ts` até a parte de checkout, se existir**

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/next.config.ts frontend/e2e/security-headers.spec.ts frontend/playwright.config.ts
git commit -m "fix: publica os headers de segurança do site"
```

### Task 3: Expurgo de analytics

**Files:**
- Create: `backend/src/use-cases/@Analytics/purge-old-events.ts`
- Test: `backend/src/use-cases/@Analytics/purge-old-events.spec.ts`
- Modify: `backend/src/worker.ts` para chamar a função no máximo uma vez por processo a cada 24 h, no início, e de novo a cada 24 h com `setInterval`. O projeto não usa `node-cron`. `setInterval` no worker é o mecanismo. Não agendar no processo da API.

```ts
export function purgeBefore(now: Date): Date {
  const copy = new Date(now.getTime())
  copy.setUTCMonth(copy.getUTCMonth() - 12)
  return copy
}
```

O spec congela `now` em `2026-10-09` e espera `2025-10-09`. O repositório em memória apaga linhas com `day` estritamente anterior. Linha no dia exato permanece. Um teste de nome deixa claro que um array de pedidos passado por engano não é aceito: a função só recebe eventos.

- [ ] **Step 1: Write the failing test**

- [ ] **Step 2: Run and confirm FAIL**

- [ ] **Step 3: Implement and call from the worker**

Logar a quantidade apagada. Não logar `sessionId`.

- [ ] **Step 4: Run the spec**

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/use-cases/@Analytics/purge-old-events.ts backend/src/use-cases/@Analytics/purge-old-events.spec.ts backend/src/worker.ts
git commit -m "feat: apaga analytics de sessão com mais de 12 meses"
```

### Task 4: Confirmação da etapa

- [ ] **Step 1: Run**

From `backend`: `npx vitest run src/adapters/notifications/email/templates.spec.ts src/use-cases/@Analytics/purge-old-events.spec.ts src/http/controllers/@Links/links.spec.ts`

From `frontend`: `npx playwright test e2e/security-headers.spec.ts --project=catalog`

Expected: PASS.

- [ ] **Step 2: Prove the AI job stayed unwired**

Run from the repo root:

```bash
rg "queue.add\\('moderate-link'" backend/src
```

Expected: no matches. Se aparecer match, remover nesta etapa. O handler em `worker.ts` pode continuar existindo; o que não pode existir é o enfileiramento.
