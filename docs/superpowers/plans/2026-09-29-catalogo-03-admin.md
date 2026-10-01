# Admin, contestação e banimento — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Uma contestação por envio, decisão do admin sem trava de nicho, e banimento que tira o catálogo sem estorno automático.

**Architecture:** Admin passa por `authorize` com papel `ADMIN` no tenant do host. A URL do link não entra no corpo da decisão.

**Tech Stack:** O mesmo da fundação.

## Global Constraints

Herdadas do mapa. Banimento não cria estorno e não religa promoção. Contestação não publica sozinha.

---

### Task 1: Contestação e decisão

**Files:**
- Create: `backend/src/use-cases/@Moderation/appeal.ts`
- Create: `backend/src/use-cases/@Moderation/appeal.spec.ts`
- Create: `backend/src/use-cases/@Moderation/decide-case.ts`
- Create: `backend/src/use-cases/@Moderation/decide-case.spec.ts`
- Create: `backend/src/http/controllers/@Admin/moderation.ts`

**Interfaces:**
- Consumes: `ModerationCase`, `transition` do link
- Produces: `appeal`. `decideCase`. `POST /api/v1/links/:id/appeal` body `{ text }`. `POST /api/v1/admin/moderation/:id` body `{ decision, name?, description?, networkId?, nicheId?, reason?, newNiche? }`.

- [x] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { appeal } from '@/use-cases/@Moderation/appeal'
import { decideCase } from '@/use-cases/@Moderation/decide-case'

describe('contestação', () => {
  it('só aceita uma e não publica sozinha', () => {
    expect(appeal({ alreadyAppealed: false, text: 'foi engano' }).status).toBe('PENDING_MODERATION')
    expect(() => appeal({ alreadyAppealed: true, text: 'de novo' })).toThrow(/uma vez/)
  })
})

describe('decisão', () => {
  it('não troca a URL e exige idade explícita ao criar nicho', () => {
    const result = decideCase({
      decision: 'APPROVE',
      url: 'https://t.me/canal',
      nextUrl: 'https://t.me/outro',
      requiresAge: true,
      creatingNiche: true,
    })
    expect(result.url).toBe('https://t.me/canal')
    expect(result.status).toBe('PUBLISHED')
    expect(result.requiresAge).toBe(true)
    expect(result.occupiesSlot).toBe(true)
  })

  it('recusa criar nicho de golpe', () => {
    expect(() => decideCase({
      decision: 'APPROVE',
      url: 'https://t.me/canal',
      creatingNiche: true,
      nicheKind: 'SCAM',
      requiresAge: false,
      wasPublished: false,
    })).toThrow(/nicho/)
  })

  it('recusa final de link nunca publicado libera a vaga', () => {
    expect(decideCase({
      decision: 'REJECT',
      url: 'https://t.me/canal',
      wasPublished: false,
    }).occupiesSlot).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/use-cases/@Moderation/appeal.spec.ts src/use-cases/@Moderation/decide-case.spec.ts`
Expected: FAIL

- [x] **Step 3: Write minimal implementation**

```ts
export function appeal(input: { alreadyAppealed: boolean; text: string }): { status: 'PENDING_MODERATION' } {
  if (input.alreadyAppealed) throw new Error('contestação uma vez')
  if (!input.text.trim()) throw new Error('texto')
  return { status: 'PENDING_MODERATION' }
}
```

```ts
export function decideCase(input: {
  decision: 'APPROVE' | 'REJECT'
  url: string
  nextUrl?: string
  creatingNiche?: boolean
  nicheKind?: 'SCAM' | 'PERSONAL_DATA' | 'MINOR' | 'NORMAL'
  requiresAge?: boolean
  wasPublished?: boolean
}): { url: string; status: 'PUBLISHED' | 'PRE_REJECTED'; requiresAge: boolean; occupiesSlot: boolean } {
  if (input.creatingNiche && (input.nicheKind === 'SCAM' || input.nicheKind === 'PERSONAL_DATA' || input.nicheKind === 'MINOR')) {
    throw new Error('não vira nicho')
  }
  if (input.creatingNiche && typeof input.requiresAge !== 'boolean') {
    throw new Error('requiresAge explícito')
  }
  if (input.decision === 'REJECT') {
    return {
      url: input.url,
      status: input.wasPublished ? 'PUBLISHED' : 'PRE_REJECTED',
      requiresAge: false,
      occupiesSlot: input.wasPublished === true,
    }
  }
  return { url: input.url, status: 'PUBLISHED', requiresAge: input.requiresAge === true, occupiesSlot: true }
}
```

`nextUrl` é ignorado. Motivo é opcional. Alerta de nicho divergente não bloqueia `APPROVE`. Rejeitar link que já estava no ar restaura o último texto aprovado. Rejeitar pré-recusa ou envio que nunca publicou libera a cota. Nicho salvo com `requiresAge` sai da home na mesma transação. A resposta ao usuário não lista o sinal interno. Audit grava ator, tenant, antes, depois, `request_id` e o motivo.

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- src/use-cases/@Moderation/appeal.spec.ts src/use-cases/@Moderation/decide-case.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/use-cases/@Moderation backend/src/http/controllers/@Admin
git commit -m "feat: contestação e decisão do admin"
```

---

### Task 2: Banimento

**Files:**
- Create: `backend/src/use-cases/@Admin/ban-account.ts`
- Test: `backend/src/use-cases/@Admin/ban-account.spec.ts`

**Interfaces:**
- Consumes: `transition` de link e promoção
- Produces: `banAccount`. Login de leitura continua. Escrita responde 403.

- [x] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { banAccount } from '@/use-cases/@Admin/ban-account'

describe('banimento', () => {
  it('tira os links e cancela o destaque sem estornar', () => {
    const result = banAccount({
      links: [{ id: 'l1', status: 'PUBLISHED' }],
      promotions: [{ id: 'p1', status: 'ACTIVE' }],
    })
    expect(result.userStatus).toBe('BANNED')
    expect(result.links[0].status).toBe('UNAVAILABLE')
    expect(result.promotions[0].status).toBe('CANCELLED')
    expect(result.refunds).toEqual([])
  })

  it('tira também o rascunho pela transição', () => {
    const result = banAccount({
      links: [{ id: 'l2', status: 'DRAFT' }],
      promotions: [],
    })
    expect(result.links[0].status).toBe('UNAVAILABLE')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/use-cases/@Admin/ban-account.spec.ts`
Expected: FAIL

- [x] **Step 3: Write minimal implementation**

```ts
import { linkMachine, promotionMachine, transition } from '@/domain/state/transition'

export function banAccount(input: {
  links: { id: string; status: 'PUBLISHED' | 'PENDING_MODERATION' | 'PRE_REJECTED' | 'DRAFT' | 'UNAVAILABLE' }[]
  promotions: { id: string; status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' }[]
}) {
  return {
    userStatus: 'BANNED' as const,
    links: input.links.map((link) => ({
      id: link.id,
      status: link.status === 'UNAVAILABLE' ? link.status : transition(linkMachine, link.status, 'UNAVAILABLE'),
    })),
    promotions: input.promotions.map((promotion) => ({
      id: promotion.id,
      status: promotion.status === 'ACTIVE' ? transition(promotionMachine, 'ACTIVE', 'CANCELLED') : promotion.status,
    })),
    refunds: [] as [],
  }
}
```

Checkout novo dessa conta falha antes de criar cobrança, com motivo genérico. Link já publicado por outra regra não é reavaliado por este banimento de pagamento: o banimento da conta, este use case, torna todos os links dela indisponíveis. Promoção `CANCELLED` não volta. Dinheiro fica no estado real do pedido. A tela não diz reembolsado se o status não for `REFUNDED`. Conta banida não troca e-mail nem telefone. Audit grava o motivo do admin. O usuário vê motivo genérico.

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- src/use-cases/@Admin/ban-account.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/use-cases/@Admin
git commit -m "feat: banimento tira o catálogo e cancela destaque"
```

## Gate deste plano

Usuário comum recebe `not_found` na rota de admin. Segunda contestação falha. Banimento não chama `refund`. `payments.spec.ts` continua passando.

## Status de implementação

Reconciliado em 2026-09-30 (Task 10), contra o código e as suítes do mesmo dia: backend `npm test` 198/198 (50 arquivos), `test:pg` 30/30, frontend 7/7, Playwright 15/15 em duas execuções seguidas (uma terceira anterior teve 1 falha intermitente, ver plano 07), typecheck, lint, build e `npm audit --audit-level=high` sem vulnerabilidade nos dois workspaces.

Regra das marcas: Step 1 e Step 3 marcados quando o spec e a implementação declarados existem; Step 4 marcado quando o spec passa numa dessas suítes. Step 2 ("ver falhar") é histórico e não se prova retroativamente: fica `[ ]`. Step 5 (commit) não foi executado por instrução: fica `[ ]`. Nenhum histórico foi apagado.

| Task | Status | Evidência |
|---|---|---|
| Task 1: Contestação e decisão | PASS | `appeal.spec.ts`, `decide-case.spec.ts`; Playwright `admin não confia no cookie e a decisão persiste` |
| Task 2: Banimento | PASS | `ban-account.spec.ts` |
