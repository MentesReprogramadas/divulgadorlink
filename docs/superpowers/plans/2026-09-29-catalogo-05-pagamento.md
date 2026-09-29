# Checkout, webhook e renovação — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cobrar destaque só de link publicado, impedir corrida de checkout, ligar os use cases de pagamento já testados ao webhook e ao worker, e renovar a mesma promoção.

**Architecture:** `assertCheckout` roda antes de Stripe ou Woovi. O controller do webhook não decide estado: ele chama `ConfirmGatewayPaymentUseCase`, que relê a cobrança. Não há cron.

**Tech Stack:** Use cases em `backend/src/use-cases/@Payments`. Adapters Stripe e Woovi já existem.

## Global Constraints

Herdadas do mapa. Não reescrever a máquina de Pix, estorno e admin já coberta por `payments.spec.ts`. Não criar `SEARCH_HOME` nem `NICHE_HOME`. +18 não compra produto que inclui `HOME`.

---

### Task 1: Checkout

**Files:**
- Create: `backend/src/use-cases/@Promotions/start-checkout.ts`
- Test: `backend/src/use-cases/@Promotions/start-checkout.spec.ts`
- Modify: `backend/prisma/schema.prisma`

**Interfaces:**
- Consumes: `priceFor`
- Produces: `assertCheckout`. `POST /api/v1/promotions/checkout` body `{ linkId, surfaces, durationDays }`. A resposta traz `orderId`, `code`, `amountCents`, `savingsCents`. O cliente não envia preço.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { assertCheckout } from '@/use-cases/@Promotions/start-checkout'

const base = {
  account: 'ACTIVE' as const,
  link: 'PUBLISHED' as const,
  requiresAge: false,
  surfaces: ['SEARCH' as const],
  activeSurfaces: [] as string[],
  pendingSurfaces: [] as string[],
}

describe('checkout', () => {
  it('recusa pacote se SEARCH já está ativo', () => {
    expect(() => assertCheckout({ ...base, surfaces: ['SEARCH', 'NICHE'], activeSurfaces: ['SEARCH'] })).toThrow(/SEARCH/)
  })

  it('recusa HOME para nicho com idade', () => {
    expect(() => assertCheckout({ ...base, requiresAge: true, surfaces: ['HOME'] })).toThrow(/HOME/)
    expect(() => assertCheckout({ ...base, requiresAge: true, surfaces: ['SEARCH', 'NICHE', 'HOME'] })).toThrow(/HOME/)
  })

  it('recusa pendência da mesma superfície e conta banida', () => {
    expect(() => assertCheckout({ ...base, pendingSurfaces: ['SEARCH'] })).toThrow(/pendente/)
    expect(() => assertCheckout({ ...base, account: 'BANNED' })).toThrow(/conta/)
  })

  it('aceita SEARCH em nicho com idade', () => {
    expect(assertCheckout({ ...base, requiresAge: true, surfaces: ['SEARCH'] })).toBe(true)
  })

  it('não troca SEARCH_HOME por outro produto', () => {
    expect(() => assertCheckout({ ...base, surfaces: ['SEARCH', 'HOME'] })).toThrow(/disponível/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/use-cases/@Promotions/start-checkout.spec.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```ts
import type { Surface } from '@/domain/promotions/price-for'

export function assertCheckout(input: {
  account: 'ACTIVE' | 'BANNED'
  link: 'PUBLISHED' | 'PENDING_MODERATION' | 'UNAVAILABLE'
  requiresAge: boolean
  surfaces: Surface[]
  activeSurfaces: string[]
  pendingSurfaces: string[]
}): true {
  if (input.account !== 'ACTIVE') throw new Error('conta')
  if (input.link !== 'PUBLISHED') throw new Error('link')
  const wantsHome = input.surfaces.includes('HOME')
  if (input.requiresAge && wantsHome) throw new Error('HOME')
  const blocked = input.surfaces.find((surface) =>
    input.activeSurfaces.includes(surface) || input.pendingSurfaces.includes(surface))
  if (blocked && input.activeSurfaces.includes(blocked)) throw new Error(blocked)
  if (blocked) throw new Error('pendente')
  const key = [...input.surfaces].sort().join('+')
  const allowed = new Set(['SEARCH', 'NICHE', 'HOME', 'NICHE+SEARCH', 'HOME+NICHE+SEARCH'])
  if (!allowed.has(key)) throw new Error('Combinação não está disponível')
  return true
}
```

`Order` tem `createdAt`. `Payment` tem `createdAt` e não tem `userId`. `Order.userId` é anulável. Esses relógios existem para a retenção de 5 anos. Este plano não cria o job. A transação trava as linhas do link. Dois checkouts simultâneos da mesma superfície: o segundo estoura o índice único parcial `UNIQUE (link_id, surface) WHERE status = 'ACTIVE'` e `UNIQUE (link_id, surface) WHERE order_status = 'PENDING_PAYMENT'`. Conta banida falha antes de `createCharge`. Pix usa `expiresInSeconds: 1800` e enfileira `expire-pix` com delay de 1_800_000 ms. Cartão usa `StripeCardPaymentGateway.createCharge`. O preço gravado no pedido é o `amountCents` de `priceFor` sobre as linhas vigentes. Superfícies do pacote só nascem com o mesmo `startsAt` e `expiresAt` depois do pagamento.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/use-cases/@Promotions/start-checkout.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/use-cases/@Promotions backend/prisma
git commit -m "feat: checkout recusa pacote sobre superfície ativa"
```

---

### Task 2: Webhook e worker

**Files:**
- Create: `backend/src/http/controllers/@Payments/stripe-webhook.ts`
- Create: `backend/src/http/controllers/@Payments/woovi-webhook.ts`
- Modify: `backend/src/worker.ts`
- Test: `backend/src/use-cases/@Payments/payments.spec.ts`

**Interfaces:**
- Consumes: `ConfirmGatewayPaymentUseCase`, `ExpirePixOrderUseCase`, `RequestPixRefundUseCase`, `RegisterRefundResolvedUseCase`
- Produces: `POST /api/v1/payments/stripe/webhook`, `POST /api/v1/payments/woovi/webhook`, jobs `expire-pix` e `refund-pix`, `POST /api/v1/admin/refunds/:orderId/resolved`.

- [ ] **Step 1: Write the failing test**

Acrescentar em `payments.spec.ts` apenas se ainda não existir. A suíte atual já cobre prazo, tardio, três falhas, o mesmo `correlationID` e o admin. O teste novo do controller:

```ts
it('não pede segundo estorno quando o eventId já foi processado', async () => {
  const scheduler = { calls: 0, scheduleRetry: async () => { scheduler.calls += 1 } }
  const useCase = new ConfirmGatewayPaymentUseCase(orders, gateway, activator, scheduler, () => late)
  await useCase.execute({ orderId: order.id, eventId: 'evt-1' })
  await useCase.execute({ orderId: order.id, eventId: 'evt-1' })
  expect(scheduler.calls).toBe(1)
})
```

Reusar o pedido tardio que a suíte já monta. Não copiar a regra para o controller.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/use-cases/@Payments/payments.spec.ts`
Expected: a suíte atual PASS. Se o caso de replay ainda não estiver explícito no controller, o teste de HTTP do webhook sem assinatura fica para o plano 6. Este passo falha só se o replay chamar `scheduleRetry` duas vezes.

- [ ] **Step 3: Write minimal implementation**

O controller Stripe recusa corpo sem assinatura válida do `STRIPE_WEBHOOK_SECRET` com 400 e não chama o use case. O controller Woovi extrai `correlationID` e chama o use case. Os dois passam `{ orderId, eventId }`. Quem muda status é `ConfirmGatewayPaymentUseCase`, que já relê `getCharge`. O worker registra `expire-pix` em `ExpirePixOrderUseCase` e `refund-pix` em `RequestPixRefundUseCase`. Não importar `node-cron`. `REFUND_FAILED` enfileira `notify-refund-failed` com número do pedido, pagamento tardio, promoção inativa e estorno incompleto. O admin em `resolved` só chama `RegisterRefundResolvedUseCase`.

O `jobId` de retentativa não usa `Date.now()`. A idempotência continua no `correlationId` `refund-${orderId}` que o use case já reutiliza. Ajustar `bull-refund-scheduler.ts` para `jobId: refund-${orderId}-${attempt}` só se a suíte de adapters continuar passando. Não mudar a regra das três tentativas.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/use-cases/@Payments/payments.spec.ts src/adapters/adapters.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/http/controllers/@Payments backend/src/worker.ts backend/src/adapters/queues
git commit -m "feat: webhook e worker de Pix sem cron"
```

---

### Task 3: Renovação

**Files:**
- Create: `backend/src/use-cases/@Promotions/renew.ts`
- Test: `backend/src/use-cases/@Promotions/renew.spec.ts`

**Interfaces:**
- Consumes: promoção `ACTIVE`
- Produces: `renew`. Mantém `activatedAt`. Soma `durationDays` em `expiresAt`. Não cria outra promoção.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { renew } from '@/use-cases/@Promotions/renew'

describe('renovação', () => {
  it('estende o fim e preserva a ativação', () => {
    const result = renew({
      status: 'ACTIVE',
      activatedAt: new Date('2026-09-01T00:00:00.000Z'),
      expiresAt: new Date('2026-09-29T00:00:00.000Z'),
      durationDays: 28,
    })
    expect(result.activatedAt.toISOString()).toBe('2026-09-01T00:00:00.000Z')
    expect(result.expiresAt.toISOString()).toBe('2026-10-27T00:00:00.000Z')
    expect(result.createdNewPromotion).toBe(false)
  })

  it('não renova promoção expirada', () => {
    expect(() => renew({
      status: 'EXPIRED',
      activatedAt: new Date('2026-09-01T00:00:00.000Z'),
      expiresAt: new Date('2026-09-29T00:00:00.000Z'),
      durationDays: 28,
    })).toThrow(/expirada/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/use-cases/@Promotions/renew.spec.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```ts
const DAY_MS = 24 * 60 * 60 * 1000

export function renew(input: {
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED'
  activatedAt: Date
  expiresAt: Date
  durationDays: number
}): { activatedAt: Date; expiresAt: Date; createdNewPromotion: false } {
  if (input.status !== 'ACTIVE') throw new Error('expirada')
  return {
    activatedAt: input.activatedAt,
    expiresAt: new Date(input.expiresAt.getTime() + input.durationDays * DAY_MS),
    createdNewPromotion: false,
  }
}
```

Pacote aplica o mesmo `durationDays` em cada superfície do grupo. Promoção `EXPIRED` não entra aqui: a compra seguinte cria promoção com `activatedAt` novo. Pedido da renovação é outro, com o preço vigente. Checkout de pacote que inclui superfície `ACTIVE` continua no `assertCheckout`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/use-cases/@Promotions/renew.spec.ts`
Expected: PASS. 29/09 mais 28 dias é 27/10.

- [ ] **Step 5: Commit**

```bash
git add backend/src/use-cases/@Promotions/renew.ts backend/src/use-cases/@Promotions/renew.spec.ts
git commit -m "feat: renovação estende a mesma promoção"
```

## Gate deste plano

Dois checkouts da mesma superfície não ficam ambos `PENDING_PAYMENT`. Webhook sem reler o provedor não existe. `REFUND_FAILED` não vira promoção. `payments.spec.ts` passa.
