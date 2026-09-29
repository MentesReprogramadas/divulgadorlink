# Fundação do catálogo — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Subir a API com tenant pelo host, conta, preços, log, máquina de estados, autorização e anonimização da conta.

**Architecture:** Fastify 5 e Prisma 6. O host resolve o tenant. O corpo não escolhe `tenantId`. Status só muda por `transition`.

**Tech Stack:** Fastify 5.1, Prisma 6.0.1, Zod 3.24, Vitest 2.1, PostgreSQL 16 pgvector, Redis 7, `@hyperdx/node-opentelemetry` 0.8.1.

## Global Constraints

Herdadas de `docs/superpowers/plans/2026-09-29-catalogo.md`. Este plano não cria job de limpeza. Os 11 testes de pagamento continuam passando.

---

### Task 1: API e health

**Files:**
- Create: `backend/docker-compose.yml`
- Create: `backend/prisma/schema.prisma`
- Create: `backend/src/env/index.ts`
- Create: `backend/src/app.ts`
- Create: `backend/src/server.ts`
- Create: `backend/src/http/controllers/@Health/health.ts`
- Test: `backend/src/http/controllers/@Health/health.spec.ts`
- Modify: `backend/package.json`

**Interfaces:**
- Consumes: nada
- Produces: `GET /api/v1/actuator/health` → `{ status: "ok" }`. `env` validado por Zod. Compose com `pgvector/pgvector:pg16` e `redis:7`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { app } from '@/app'

describe('health', () => {
  it('responde ok', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/actuator/health' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: 'ok' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/http/controllers/@Health/health.spec.ts`
Expected: FAIL, módulo `@/app` ausente.

- [ ] **Step 3: Write minimal implementation**

`backend/docker-compose.yml`:

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    ports: ["5432:5432"]
    environment:
      POSTGRES_PASSWORD: divulgador
      POSTGRES_USER: divulgador
      POSTGRES_DB: divulgador
  redis:
    image: redis:7
    ports: ["6379:6379"]
```

`backend/src/env/index.ts`:

```ts
import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
  NODE_ENV: z.enum(['dev', 'test', 'production']).default('dev'),
  PORT: z.coerce.number().default(3333),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  HDX_API_KEY: z.string().optional(),
  HDX_SERVICE_NAME: z.string().default('divulgador-links-api'),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  WOOVI_APP_ID: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
})

const parsed = schema.safeParse(process.env)
if (!parsed.success) {
  console.error(parsed.error.format())
  throw new Error('Variáveis de ambiente inválidas.')
}

export const env = parsed.data
```

`backend/src/app.ts` registra Fastify, prefixo `/api/v1`, a rota de health e handler de `ZodError` com status 400. `backend/src/server.ts` escuta `env.PORT` e não chama cron. `schema.prisma` nesta task só tem generator `prisma-client-js` e datasource PostgreSQL. Acrescentar em `package.json` as dependências `prisma@6.0.1`, `@prisma/client@6.0.1`, `@fastify/jwt@^9`, `@fastify/cookie`, `bcryptjs`, `@hyperdx/node-opentelemetry@0.8.1`. Não adicionar `node-cron`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/http/controllers/@Health/health.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend
git commit -m "feat: sobe a API com health check"
```

---

### Task 2: Tenant, usuário e identificadores

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/src/repositories/tenants-repository.ts`
- Create: `backend/src/http/tenant.ts`
- Test: `backend/src/http/tenant.spec.ts`

**Interfaces:**
- Consumes: Task 1
- Produces: `resolveTenant(host: string): Promise<{ id: string }>`. Models `Tenant`, `User`, `UserIdentifier`, `VerificationCode`. Único é `(tenantId, normalizedValue)`, não o e-mail global.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { resolveTenant } from '@/http/tenant'

describe('tenant', () => {
  it('resolve pelo host e ignora um tenantId que tenha vindo no corpo', async () => {
    const tenant = await resolveTenant('temlinkaqui.com', { tenantId: 'outro' })
    expect(tenant.id).not.toBe('outro')
    expect(tenant.id).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/http/tenant.spec.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

Acrescentar ao schema:

```prisma
model Tenant {
  id        String   @id @default(cuid())
  host      String   @unique
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  users     User[]
  @@map("tenants")
}

model User {
  id           String    @id @default(cuid())
  tenantId     String
  tenant       Tenant    @relation(fields: [tenantId], references: [id])
  name         String
  passwordHash String
  role         UserRole  @default(USER)
  status       UserStatus @default(ACTIVE)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  identifiers  UserIdentifier[]
  @@index([tenantId])
  @@map("users")
}

enum UserRole { USER ADMIN }
enum UserStatus { ACTIVE BANNED }

model UserIdentifier {
  id              String           @id @default(cuid())
  userId          String
  user            User             @relation(fields: [userId], references: [id])
  tenantId        String
  kind            IdentifierKind
  normalizedValue String
  confirmedAt     DateTime?
  replacedAt      DateTime?
  createdAt       DateTime         @default(now())
  @@unique([tenantId, kind, normalizedValue])
  @@index([userId])
  @@map("user_identifiers")
}

enum IdentifierKind { EMAIL PHONE }

model VerificationCode {
  id         String   @id @default(cuid())
  userId     String
  kind       IdentifierKind
  codeHash   String
  expiresAt  DateTime
  attempts   Int      @default(0)
  createdAt  DateTime @default(now())
  @@index([userId, kind, createdAt])
  @@map("verification_codes")
}
```

`resolveTenant` busca `Tenant.host`. O segundo argumento é ignorado. Host desconhecido lança erro de não encontrado. Nenhum controller lê `tenantId` do body.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/http/tenant.spec.ts`
Expected: PASS. O teste usa um repositório em memória semeado com `temlinkaqui.com`.

- [ ] **Step 5: Commit**

```bash
git add backend/prisma backend/src/http/tenant.ts backend/src/repositories
git commit -m "feat: resolve o tenant pelo host"
```

---

### Task 3: Auth com e-mail e telefone confirmados

**Files:**
- Create: `backend/src/use-cases/@Auth/confirm-identifier.ts`
- Create: `backend/src/use-cases/@Auth/confirm-identifier.spec.ts`
- Create: `backend/src/use-cases/@Auth/register.ts`
- Create: `backend/src/http/controllers/@auth/routes.ts`
- Create: `backend/src/http/middlewares/verify-jwt.ts`

**Interfaces:**
- Consumes: Task 2
- Produces: `canSubmitLink`. `POST /api/v1/auth/register` sem campo `role`. `POST /api/v1/auth/confirm`. JWT 5 min. Cookie `refreshToken` HttpOnly, Secure em produção, SameSite=Lax. 6º reenvio em 60 minutos responde 429.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { canSubmitLink, assertResendAllowed } from '@/use-cases/@Auth/confirm-identifier'

describe('confirmação', () => {
  it('bloqueia envio sem os dois identificadores confirmados', () => {
    expect(canSubmitLink({
      emailConfirmed: true, phoneConfirmed: false, status: 'ACTIVE',
    })).toBe(false)
    expect(canSubmitLink({
      emailConfirmed: true, phoneConfirmed: true, status: 'ACTIVE',
    })).toBe(true)
  })

  it('bloqueia conta banida', () => {
    expect(canSubmitLink({
      emailConfirmed: true, phoneConfirmed: true, status: 'BANNED',
    })).toBe(false)
  })

  it('para no sexto reenvio da janela', () => {
    expect(() => assertResendAllowed(5)).toThrow(/limite/)
    expect(assertResendAllowed(4)).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/use-cases/@Auth/confirm-identifier.spec.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```ts
export function canSubmitLink(user: {
  emailConfirmed: boolean
  phoneConfirmed: boolean
  status: 'ACTIVE' | 'BANNED'
}): boolean {
  return user.status === 'ACTIVE' && user.emailConfirmed && user.phoneConfirmed
}

export function assertResendAllowed(sentInWindow: number): true {
  if (sentInWindow >= 5) throw new Error('limite de reenvio')
  return true
}
```

O schema Zod de `register` tem `name`, `email`, `phone`, `password`. Não tem `role`. Papel nasce `USER`. Confirmar grava `confirmedAt` no identificador. Trocar e-mail ou telefone cria linha nova com `confirmedAt` nulo e preenche `replacedAt` na linha antiga. A linha antiga não é apagada. Enquanto o novo valor não confirma, `canSubmitLink` é falso. Conta já pode ver o painel antes da confirmação.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/use-cases/@Auth/confirm-identifier.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/use-cases/@Auth backend/src/http
git commit -m "feat: exige e-mail e telefone confirmados para enviar link"
```

---

### Task 4: Preços, redes, nichos e config

**Files:**
- Create: `backend/src/domain/promotions/price-for.ts`
- Create: `backend/src/domain/config/read-config.ts`
- Create: `backend/src/domain/promotions/price-for.spec.ts`
- Create: `backend/prisma/seed.ts`
- Modify: `backend/prisma/schema.prisma`

**Interfaces:**
- Consumes: Task 2
- Produces: `priceFor(rows, surfaces, durationDays)`. Códigos `SEARCH`, `NICHE`, `HOME`, `SEARCH_NICHE`, `SEARCH_NICHE_HOME`. Chaves de config: `MODERATION_AUTO_APPROVE_THRESHOLD`, `SEARCH_RELEVANCE_THRESHOLD`, `SEARCH_TEXT_WEIGHT`, `SEARCH_SEMANTIC_WEIGHT`.

Os quatro números abaixo aparecem uma vez, em `INITIAL_CONFIG`, dentro de `prisma/seed.ts`. São o valor com que o processo sobe. Não são limiar validado para produção. Use case, teste de regra e adapter não copiam esses números. Leem `readConfig`. Admin do tenant altera pela API. A alteração grava auditoria com valor anterior, valor novo, ator e `request_id`. O caso de moderação copia o limiar lido e o `updatedAt` da config. A busca lê a config na hora. Reproduzir uma busca antiga usa essa auditoria, sem tabela nova e sem prazo novo.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { PRICE_ROWS, priceFor } from '@/domain/promotions/price-for'
import { readConfig } from '@/domain/config/read-config'

describe('preço', () => {
  it('não aceita SEARCH_HOME', () => {
    expect(() => priceFor(PRICE_ROWS, ['SEARCH', 'HOME'], 7)).toThrow(/não está disponível/)
  })

  it('devolve SEARCH_NICHE de 28 dias a 3990 e a economia contra a soma', () => {
    expect(priceFor(PRICE_ROWS, ['NICHE', 'SEARCH'], 28)).toEqual({
      code: 'SEARCH_NICHE',
      amountCents: 3990,
      savingsCents: 990,
    })
  })
})

describe('config', () => {
  it('lê a linha gravada e não inventa fallback', () => {
    expect(readConfig({ SEARCH_RELEVANCE_THRESHOLD: '0.1' }, 'SEARCH_RELEVANCE_THRESHOLD')).toBe(0.1)
    expect(() => readConfig({}, 'SEARCH_RELEVANCE_THRESHOLD')).toThrow(/config/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/domain/promotions/price-for.spec.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```ts
export type Surface = 'SEARCH' | 'NICHE' | 'HOME'
export type ProductCode = 'SEARCH' | 'NICHE' | 'HOME' | 'SEARCH_NICHE' | 'SEARCH_NICHE_HOME'

export interface PriceRow {
  code: ProductCode
  durationDays: 7 | 14 | 28
  amountCents: number
}

const CODE_BY_KEY: Record<string, ProductCode> = {
  SEARCH: 'SEARCH',
  NICHE: 'NICHE',
  HOME: 'HOME',
  'NICHE+SEARCH': 'SEARCH_NICHE',
  'HOME+NICHE+SEARCH': 'SEARCH_NICHE_HOME',
}

export const PRICE_ROWS: PriceRow[] = [
  { code: 'SEARCH', durationDays: 7, amountCents: 790 },
  { code: 'SEARCH', durationDays: 14, amountCents: 1290 },
  { code: 'SEARCH', durationDays: 28, amountCents: 1990 },
  { code: 'NICHE', durationDays: 7, amountCents: 1190 },
  { code: 'NICHE', durationDays: 14, amountCents: 1990 },
  { code: 'NICHE', durationDays: 28, amountCents: 2990 },
  { code: 'HOME', durationDays: 7, amountCents: 1990 },
  { code: 'HOME', durationDays: 14, amountCents: 3490 },
  { code: 'HOME', durationDays: 28, amountCents: 4990 },
  { code: 'SEARCH_NICHE', durationDays: 7, amountCents: 1790 },
  { code: 'SEARCH_NICHE', durationDays: 14, amountCents: 2990 },
  { code: 'SEARCH_NICHE', durationDays: 28, amountCents: 3990 },
  { code: 'SEARCH_NICHE_HOME', durationDays: 7, amountCents: 3290 },
  { code: 'SEARCH_NICHE_HOME', durationDays: 14, amountCents: 5490 },
  { code: 'SEARCH_NICHE_HOME', durationDays: 28, amountCents: 6990 },
]

export const CONFIG_KEYS = [
  'MODERATION_AUTO_APPROVE_THRESHOLD',
  'SEARCH_RELEVANCE_THRESHOLD',
  'SEARCH_TEXT_WEIGHT',
  'SEARCH_SEMANTIC_WEIGHT',
] as const

export type ConfigKey = (typeof CONFIG_KEYS)[number]

export const INITIAL_CONFIG: Record<ConfigKey, string> = {
  MODERATION_AUTO_APPROVE_THRESHOLD: '0.85',
  SEARCH_RELEVANCE_THRESHOLD: '0.35',
  SEARCH_TEXT_WEIGHT: '0.4',
  SEARCH_SEMANTIC_WEIGHT: '0.6',
}

// read-config.ts. priceFor e PRICE_ROWS ficam em price-for.ts.
export function readConfig(rows: Partial<Record<ConfigKey, string>>, key: ConfigKey): number {
  const raw = rows[key]
  if (raw === undefined) throw new Error('config ausente')
  const value = Number(raw)
  if (!Number.isFinite(value)) throw new Error('config inválida')
  return value
}

export function priceFor(rows: PriceRow[], surfaces: Surface[], durationDays: number) {
  const key = [...surfaces].sort().join('+')
  const code = CODE_BY_KEY[key]
  if (!code) throw new Error('Combinação não está disponível')
  const row = rows.find((item) => item.code === code && item.durationDays === durationDays)
  if (!row) throw new Error('Duração não está disponível')
  const singles = surfaces.reduce((sum, surface) => {
    const single = rows.find((item) => item.code === surface && item.durationDays === durationDays)
    return sum + (single?.amountCents ?? 0)
  }, 0)
  return { code, amountCents: row.amountCents, savingsCents: singles - row.amountCents }
}
```

O seed grava `PRICE_ROWS` em `PromotionPrice` e `INITIAL_CONFIG` em `Config`, com uma linha de auditoria `config.seed` por chave, ator nulo e `before` vazio. `readConfig({}, key)` lança. Não há número de fallback no use case. `PATCH /api/v1/admin/config/:key` exige `authorize` com papel `ADMIN` no tenant do host e grava `config.update`. Redes: Discord, Facebook, Instagram, Kwai, LinkedIn, Outro, Pinterest, Reddit, Site, Telegram, Threads, TikTok, Twitch, Vimeo, Whatsapp, X, YouTube. Nicho Adulto nasce com `requiresAge = true`. Os outros nichos da spec nascem com `requiresAge = false`. `Outro` existe nas duas listas e não é facet pública. Checkout futuro lê a tabela, não esta constante. `priceFor` recebe as linhas que o repositório devolveu.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/domain/promotions/price-for.spec.ts`
Expected: PASS. `savingsCents` de `SEARCH_NICHE` 28 dias é `1990 + 2990 - 3990 = 990`.

- [ ] **Step 5: Commit**

```bash
git add backend/prisma backend/src/domain/promotions
git commit -m "feat: tabela de preços e taxonomia inicial"
```

---

### Task 5: Logger, liveness e readiness

**Files:**
- Create: `backend/src/observability/logger.ts`
- Create: `backend/src/observability/logger.spec.ts`
- Modify: `backend/src/app.ts`
- Modify: `backend/src/http/controllers/@Health/health.ts`

**Interfaces:**
- Consumes: Task 1
- Produces: `sanitizeLog`. `GET /api/v1/actuator/live` sem banco. `GET /api/v1/actuator/ready` consulta Postgres e Redis. Header `x-request-id`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { sanitizeLog } from '@/observability/logger'

describe('logger', () => {
  it('remove segredo, código, e-mail e telefone', () => {
    expect(sanitizeLog({
      event: 'auth.confirm.failed',
      password: 'segredo',
      code: '123456',
      email: 'a@b.com',
      phone: '+5511999999999',
      request_id: 'req-1',
    })).toEqual({ event: 'auth.confirm.failed', request_id: 'req-1' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/observability/logger.spec.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```ts
const SECRET_KEYS = new Set([
  'password', 'passwordHash', 'token', 'refreshToken', 'authorization',
  'code', 'apiKey', 'secret', 'cvv', 'pan', 'email', 'phone',
])

export function sanitizeLog(payload: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(payload).filter(([key]) => !SECRET_KEYS.has(key)))
}
```

`onRequest` copia `x-request-id` ou gera um. `HyperDX.init` usa `env.HDX_API_KEY` e `env.HDX_SERVICE_NAME`, no mesmo import da Contavera: `@hyperdx/node-opentelemetry`. Se `HDX_API_KEY` estiver vazio, a API sobe e o log local continua. Erro 500 em produção devolve `{ code: "internal_error", request_id }` sem stack. `/live` não abre conexão. `/ready` falha se Postgres ou Redis não responderem.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/observability/logger.spec.ts src/http/controllers/@Health/health.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/observability backend/src/app.ts backend/src/http
git commit -m "feat: logs estruturados, liveness e readiness"
```

---

### Task 6: Máquina de estados

**Files:**
- Create: `backend/src/domain/state/transition.ts`
- Test: `backend/src/domain/state/transition.spec.ts`

**Interfaces:**
- Consumes: status da spec e `ORDER_STATUSES` já existente
- Produces: `transition(machine, from, to)`. Pedido, promoção, link e usuário só mudam por aqui.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { orderMachine, promotionMachine, transition } from '@/domain/state/transition'

describe('pedido', () => {
  it('não deixa REFUND_FAILED virar PAID', () => {
    expect(() => transition(orderMachine, 'REFUND_FAILED', 'PAID')).toThrow(/transição/)
    expect(transition(orderMachine, 'REFUND_FAILED', 'REFUNDED')).toBe('REFUNDED')
  })

  it('não religa promoção cancelada', () => {
    expect(() => transition(promotionMachine, 'CANCELLED', 'ACTIVE')).toThrow(/transição/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/domain/state/transition.spec.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```ts
export function transition<T extends string>(machine: Record<string, readonly T[]>, from: T, to: T): T {
  if (!machine[from]?.includes(to)) throw new Error('transição inválida')
  return to
}

export const orderMachine = {
  PENDING_PAYMENT: ['PAID', 'EXPIRED'],
  EXPIRED: ['PAID_LATE'],
  PAID_LATE: ['REFUND_PENDING'],
  REFUND_PENDING: ['REFUNDED', 'REFUND_FAILED'],
  REFUND_FAILED: ['REFUNDED'],
  PAID: [],
  REFUNDED: [],
} as const

export const promotionMachine = {
  ACTIVE: ['EXPIRED', 'CANCELLED'],
  EXPIRED: [],
  CANCELLED: [],
} as const

export const linkMachine = {
  DRAFT: ['PENDING_MODERATION', 'UNAVAILABLE'],
  PENDING_MODERATION: ['PUBLISHED', 'PRE_REJECTED', 'UNAVAILABLE'],
  PRE_REJECTED: ['PENDING_MODERATION', 'UNAVAILABLE'],
  PUBLISHED: ['UNAVAILABLE'],
  UNAVAILABLE: [],
} as const
```

Use case novo chama `transition` antes de gravar. Não alterar os use cases de pagamento já testados nesta task: eles passam a usar `transition` só quando o plano 5 os ligar à persistência, e a suíte `payments.spec.ts` tem de continuar verde.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/domain/state/transition.spec.ts src/use-cases/@Payments/payments.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/domain/state
git commit -m "feat: transições de estado explícitas"
```

---

### Task 7: Autorização e contrato de erro

**Files:**
- Create: `backend/src/http/authorize.ts`
- Create: `backend/src/http/authorize.spec.ts`
- Create: `backend/src/http/errors.ts`

**Interfaces:**
- Consumes: tenant do host, JWT
- Produces: `authorize`. Corpo `{ code, message, request_id, issues? }` com códigos `validation`, `unauthenticated`, `forbidden`, `not_found`, `conflict`, `rate_limited`, `business_rule`, `provider_error`, `internal_error`. Recurso de outro usuário no mesmo tenant responde `not_found`, não `forbidden`, para não enumerar.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { authorize } from '@/http/authorize'

describe('autorização', () => {
  it('nega outro dono e outro tenant', () => {
    expect(authorize({
      actorId: 'u1', tenantId: 't1', ownerId: 'u2', resourceTenantId: 't1', role: 'USER', action: 'link.update',
    })).toBe(false)
    expect(authorize({
      actorId: 'u1', tenantId: 't1', ownerId: 'u1', resourceTenantId: 't2', role: 'ADMIN', action: 'link.update',
    })).toBe(false)
  })

  it('admin do próprio tenant altera link do tenant', () => {
    expect(authorize({
      actorId: 'admin', tenantId: 't1', ownerId: 'u2', resourceTenantId: 't1', role: 'ADMIN', action: 'link.update',
    })).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/http/authorize.spec.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```ts
export function authorize(input: {
  actorId: string
  tenantId: string
  ownerId: string
  resourceTenantId: string
  role: 'USER' | 'ADMIN'
  action: string
}): boolean {
  if (input.tenantId !== input.resourceTenantId) return false
  if (input.role === 'ADMIN') return true
  return input.actorId === input.ownerId
}
```

A ordem do controller é autenticação, `authorize`, use case. DTO de saída é schema Zod. Campo de Prisma que não está no schema não sai.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/http/authorize.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/http/errors.ts backend/src/http/authorize.ts backend/src/http/authorize.spec.ts
git commit -m "feat: autorização central e erro sem stack"
```

---

### Task 8: Exclusão da conta anonimiza

**Files:**
- Create: `backend/src/use-cases/@Auth/anonymize-account.ts`
- Test: `backend/src/use-cases/@Auth/anonymize-account.spec.ts`

**Interfaces:**
- Consumes: `User`, `UserIdentifier`, pedido, auditoria
- Produces: `anonymizeAccount`. Não cria job. Não apaga pedido. Não inventa prazo.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { anonymizeAccount } from '@/use-cases/@Auth/anonymize-account'

describe('exclusão da conta', () => {
  it('corta o uuid e conserva o fato financeiro', () => {
    const result = anonymizeAccount({
      user: { id: 'u1', name: 'Ana', email: 'a@b.com', phone: '+5511999999999' },
      identifiers: [{ id: 'i1', normalizedValue: 'a@b.com' }],
      orders: [{ id: 'o1', amountCents: 790, status: 'PAID', userId: 'u1', createdAt: new Date('2026-09-01T00:00:00.000Z') }],
      audits: [
        { id: 'a1', actorId: 'u1', entityId: 'u1', before: { email: 'a@b.com', userId: 'u1' } },
        { id: 'a2', actorId: 'admin', entityId: 'link1', before: { title: 'Receitas' } },
      ],
      links: [{ id: 'link1', status: 'PUBLISHED', ownerId: 'u1' }],
    })
    expect(result.user).toBeNull()
    expect(result.identifiers).toEqual([])
    expect(result.orders[0]).toMatchObject({ id: 'o1', amountCents: 790, status: 'PAID', userId: null })
    expect(result.orders[0].createdAt.toISOString()).toBe('2026-09-01T00:00:00.000Z')
    expect(result.audits[0]).toMatchObject({ actorId: null, entityId: null, before: {} })
    expect(result.audits[1]).toMatchObject({ actorId: 'admin', entityId: 'link1', before: { title: 'Receitas' } })
    expect(result.links[0]).toEqual({ id: 'link1', status: 'PUBLISHED', ownerId: null })
    const serialized = JSON.stringify(result)
    expect(serialized).not.toContain('u1')
    expect(serialized).not.toContain('a@b.com')
    expect(serialized).not.toContain('Ana')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/use-cases/@Auth/anonymize-account.spec.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```ts
const IDENTITY_KEYS = new Set(['email', 'phone', 'normalizedValue', 'userId', 'actorId', 'ownerId'])

function stripIdentity(value: Record<string, unknown>, banned: Set<string>) {
  return Object.fromEntries(Object.entries(value).filter(([key, item]) => {
    if (IDENTITY_KEYS.has(key)) return false
    return typeof item !== 'string' || !banned.has(item)
  }))
}

export function anonymizeAccount(input: {
  user: { id: string; name: string; email: string; phone: string }
  identifiers: { id: string; normalizedValue: string }[]
  orders: { id: string; amountCents: number; status: string; userId: string; createdAt: Date }[]
  audits: { id: string; actorId: string; entityId: string; before: Record<string, unknown> }[]
  links: { id: string; status: string; ownerId: string }[]
}) {
  const banned = new Set([input.user.id, input.user.name, input.user.email, input.user.phone])
  return {
    user: null,
    identifiers: [] as [],
    orders: input.orders.map((order) => ({
      id: order.id,
      amountCents: order.amountCents,
      status: order.status,
      createdAt: order.createdAt,
      userId: null as string | null,
    })),
    audits: input.audits.map((audit) => ({
      id: audit.id,
      actorId: audit.actorId === input.user.id ? null : audit.actorId,
      entityId: audit.entityId === input.user.id ? null : audit.entityId,
      before: stripIdentity(audit.before, banned),
    })),
    links: input.links.map((link) => ({ id: link.id, status: link.status, ownerId: null as string | null })),
  }
}
```

A linha da conta é apagada. Pedido e auditoria ficam sem o uuid e sem um pseudônimo comum. `createdAt` do pedido permanece: é o relógio dos 5 anos, e este plano não cria o job que o usa. Analytics não entra aqui. O status do link não muda.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/use-cases/@Auth/anonymize-account.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/use-cases/@Auth/anonymize-account.ts backend/src/use-cases/@Auth/anonymize-account.spec.ts
git commit -m "feat: exclusão da conta anonimiza a pessoa"
```

## Gate deste plano

`npm test` no backend passa, inclusive `payments.spec.ts` e `adapters.spec.ts`. `/live` não consulta banco. Log de teste não contém e-mail. Não existe worker de limpeza.
