# Atribuição e funil Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O primeiro toque de UTM fica na conta e no link, o funil fica no banco, e nenhuma request sai para a Meta sem consentimento e sem identificador.

**Architecture:** Cookie `tla_touch` no domínio do Next, primeiro toque só. A API lê esse cookie no `POST /auth/register` e grava `AcquisitionTouch`. O `POST /links` copia os cinco campos para o `Link`. `FunnelEvent` é outra tabela, com `@@unique([tenantId, eventId])`. `AnalyticsEvent` não muda. O Pixel é um componente cliente que retorna `null` se faltar `NEXT_PUBLIC` — não usar prefixo público. O id chega por um route handler `GET /anuncio/pixel` que devolve `{ enabled: false }` quando não há `META_PIXEL_ID` ou quando o cookie `tla_consent` não é `marketing`. Assim o id não precisa ir para o bundle até o consentimento, e o teste prova a ausência de script.

**Tech Stack:** Prisma 6, Fastify, Vitest, Playwright. Sem SDK novo da Meta. `fetch` para `https://graph.facebook.com` só se `META_CAPI_TOKEN` existir. Nos testes, o fetch é injetado e o default dos testes é não haver token.

## Global Constraints

- Parâmetros aceitos: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`. Cada um no máximo 80 caracteres, charset `[a-zA-Z0-9._~-]`. Fora disso, descartar o toque inteiro.
- Não gravar e-mail, telefone, nome, URL do link nem IP em `FunnelEvent`.
- `eventId` de cadastro = id do usuário. De início de envio = `${userId}:start:${YYYY-MM-DD}` no fuso `America/Sao_Paulo`. De envio = id do link. De publicação = `${linkId}:published`.
- Recusa de moderação não grava `LinkPublished`.
- Segundo insert com o mesmo `eventId` não cria outra linha e não chama a Meta de novo.
- Sem cookie de consentimento, zero script `facebook.net`.
- O Pixel já existe. O id público é `2981954672158122`, lido de `META_PIXEL_ID`. A chave da API de conversões não aparece em arquivo: só `META_CAPI_TOKEN` no ambiente da API.
- Não colar o snippet pronto da Meta no layout. Ele dispara `PageView` antes do aceite.

---

### Task 1: Parser do toque

**Files:**
- Create: `backend/src/domain/acquisition/touch.ts`
- Test: `backend/src/domain/acquisition/touch.spec.ts`

**Interfaces:**
- Consumes: nada
- Produces: `parseTouch(raw: string | undefined): Touch | null` onde `Touch = { source: string; medium: string; campaign: string; content: string; term: string; landingPath: string }`

O cookie é JSON compacto. `landingPath` só pode ser `/divulgar` nesta versão. Outro path zera o toque.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { parseTouch } from '@/domain/acquisition/touch'

const good = JSON.stringify({
  source: 'meta', medium: 'paid', campaign: 'outubro', content: 'video-1', term: 'link', landingPath: '/divulgar',
})

describe('toque de campanha', () => {
  it('aceita o primeiro toque bem formado', () => {
    expect(parseTouch(good)?.campaign).toBe('outubro')
  })

  it('rejeita caractere fora da lista e path estranho', () => {
    expect(parseTouch(JSON.stringify({ source: 'meta ads', medium: 'paid', campaign: 'a', content: '', term: '', landingPath: '/divulgar' }))).toBeNull()
    expect(parseTouch(JSON.stringify({ source: 'meta', medium: 'paid', campaign: 'a', content: '', term: '', landingPath: '/' }))).toBeNull()
  })

  it('rejeita cookie vazio', () => {
    expect(parseTouch(undefined)).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/acquisition/touch.spec.ts` from `backend`
Expected: FAIL

- [ ] **Step 3: Implement `parseTouch`**

Validar com zod `.strict()` e a regex. `content` e `term` podem ser string vazia. `source`, `medium` e `campaign` têm mínimo 1.

- [ ] **Step 4: Run test to verify it passes**

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/domain/acquisition/touch.ts backend/src/domain/acquisition/touch.spec.ts
git commit -m "test: valida o primeiro toque da campanha"
```

### Task 2: Persistência

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/20261009120000_acquisition_funnel/migration.sql`
- Create: `backend/src/use-cases/@Acquisition/record-funnel.ts`
- Test: `backend/src/use-cases/@Acquisition/record-funnel.spec.ts`

**Interfaces:**
- Consumes: `Touch`
- Produces: `recordFunnel(input: { tenantId: string; eventId: string; name: 'CompleteRegistration' | 'StartLinkSubmission' | 'SubmitLink' | 'LinkPublished'; userId: string | null; linkId: string | null }): Promise<'inserted' | 'duplicate'>`

Schema:

```prisma
model AcquisitionTouch {
  id           String   @id @default(cuid())
  tenantId     String
  userId       String   @unique
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  source       String
  medium       String
  campaign     String
  content      String
  term         String
  landingPath  String
  createdAt    DateTime @default(now())
  @@index([tenantId, campaign])
  @@map("acquisition_touches")
}

model FunnelEvent {
  id        String   @id @default(cuid())
  tenantId  String
  eventId   String
  name      String
  userId    String?
  linkId    String?
  createdAt DateTime @default(now())
  @@unique([tenantId, eventId])
  @@index([tenantId, name, createdAt])
  @@map("funnel_events")
}
```

Em `Link`, cinco colunas opcionais: `acquisitionSource`, `acquisitionMedium`, `acquisitionCampaign`, `acquisitionContent`, `acquisitionTerm`. Em `User`, relação `acquisitionTouch AcquisitionTouch?`.

`recordFunnel` usa `create` e, em P2002, devolve `duplicate` sem lançar.

- [ ] **Step 1: Write the failing test** contra um repositório em memória no spec, não contra Postgres. O spec prova que a segunda chamada com o mesmo `eventId` devolve `duplicate` e que `LinkPublished` não é gravado por uma função `publishEvent(previousStatus, nextStatus)` quando `previousStatus` já era `PUBLISHED` ou quando `nextStatus` não é `PUBLISHED`.

```ts
export function publishEventName(previous: string, next: string): 'LinkPublished' | null {
  if (previous === 'PUBLISHED') return null
  if (next !== 'PUBLISHED') return null
  return 'LinkPublished'
}
```

Teste: `PENDING_MODERATION` → `PUBLISHED` retorna o nome. `PUBLISHED` → `PUBLISHED` retorna null. `PENDING_MODERATION` → `PRE_REJECTED` retorna null.

- [ ] **Step 2: Run the spec and confirm FAIL**

- [ ] **Step 3: Add the migration and the functions**

`npx prisma migrate dev` não é o caminho do agente se o banco local não for o de teste. Escrever o SQL na mão, no estilo das migrations existentes, e aplicar no E2E pelo `migrate deploy` que o `global-setup` já roda. Não apontar migration para o banco de produção.

- [ ] **Step 4: Run the spec**

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/20261009120000_acquisition_funnel backend/src/use-cases/@Acquisition backend/src/domain/acquisition
git commit -m "feat: guarda o funil de publicação sem dado pessoal"
```

### Task 3: Cookie, cadastro e envio

**Files:**
- Modify: `frontend/src/middleware.ts`
- Modify: `backend/src/http/controllers/@auth/routes.ts` no `register`
- Modify: `backend/src/http/controllers/@Links/routes.ts` no `createLink`
- Modify: `backend/src/http/controllers/@Admin/moderation.ts` no ponto em que o status vira `PUBLISHED`
- Test: estender `backend/src/http/controllers/@Links/links.spec.ts` e o spec de auth de registro se existir; senão criar `backend/src/http/acquisition.http.spec.ts`

Comportamento:

- Middleware, só em GET de página, se a query tiver `utm_source` e o cookie `tla_touch` ainda não existir, grava o cookie `SameSite=Lax`, `Path=/`, `Max-Age=2592000`, `HttpOnly`, `Secure` fora de dev. Valor é o JSON do parser. Não sobrescreve.
- `register` lê `request.cookies.tla_touch`, faz `parseTouch`, e cria `AcquisitionTouch` na mesma transação do usuário quando o parse não é null. Também `recordFunnel` `CompleteRegistration`.
- `createLink` copia os campos do toque do dono para o link e grava `SubmitLink`.
- A decisão de moderação que passa a `PUBLISHED` pela primeira vez grava `LinkPublished` com `publishEventName`.
- `StartLinkSubmission` é gravado por `GET /api/v1/links/submission-started`, autenticado, idempotente no dia. A página `painel/links/novo` chama esse GET uma vez no mount.

- [ ] **Step 1: Write the failing HTTP test**

Dois registros. O primeiro com cookie de toque. O segundo sem. Só o primeiro tem linha de toque. Dois `SubmitLink` do mesmo link não duplicam. Aprovar uma vez grava um `LinkPublished`. Aprovar de novo, ou recusar, não grava outro.

- [ ] **Step 2: Run and confirm FAIL**

- [ ] **Step 3: Implement the wiring**

Não colocar o toque no JSON público do link. O `GET` público do link continua sem esses campos.

- [ ] **Step 4: Run the HTTP spec and `links.spec.ts`**

Expected: PASS. Se um teste antigo do corpo do `POST /links` exigir a lista exata de chaves, o corpo da resposta não ganha campo novo. A gravação é interna.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/middleware.ts backend/src/http frontend/src/app/painel/links/novo/page.tsx
git commit -m "feat: atribui o cadastro e o link ao primeiro anúncio"
```

### Task 4: Consentimento e Pixel mudo

**Files:**
- Create: `frontend/src/components/domain/consent.tsx`
- Create: `frontend/src/app/anuncio/pixel/route.ts`
- Modify: `frontend/src/app/layout.tsx` para montar o aviso em toda página
- Test: `frontend/e2e/funnel.spec.ts`

O aviso diz: “Usamos a origem da visita para saber se o anúncio gerou uma publicação. A medida da Meta só liga se você aceitar.” Botões `Aceitar` e `Agora não`. `Aceitar` seta `tla_consent=marketing` por um ano. `Agora não` seta `tla_consent=denied`. Sem escolha, nenhum script externo.

`GET /anuncio/pixel` lê o cookie e `process.env.META_PIXEL_ID`. Resposta sempre `{ enabled: boolean }`. `enabled` só é true com os dois. O componente, se `enabled`, injeta o script. O teste não define o env, então `enabled` é false e `page.route` para `**/*facebook*` deve ter zero requests. Assert isso com um contador.

Playwright também: visitar `/divulgar?utm_source=meta&utm_medium=paid&utm_campaign=outubro&utm_content=a&utm_term=b`, cadastrar, e no banco de E2E (helper `sql` de `frontend/e2e/db.ts`) a linha `acquisition_touches` existe. Segunda visita com outra campanha não troca `campaign`.

O cadastro do E2E ainda pede telefone até a etapa 4. Este teste preenche o telefone se o campo existir (`locator.count()`), para não acoplar as etapas. Quando a etapa 4 remover o campo, o `if` continua válido.

- [ ] **Step 1: Write the failing Playwright test**

- [ ] **Step 2: Run and confirm FAIL**

- [ ] **Step 3: Implement consent and the route**

- [ ] **Step 4: Run `npx playwright test e2e/funnel.spec.ts --project=catalog`**

Expected: PASS, incluindo zero request à Meta

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/domain/consent.tsx frontend/src/app/anuncio/pixel/route.ts frontend/src/app/layout.tsx frontend/e2e/funnel.spec.ts frontend/playwright.config.ts
git commit -m "feat: mede a origem da publicação sem pixel obrigatório"
```

### Task 5: Confirmação da etapa

- [ ] **Step 1: Run**

From `backend`: `npx vitest run src/domain/acquisition/touch.spec.ts src/use-cases/@Acquisition/record-funnel.spec.ts src/http/acquisition.http.spec.ts src/http/controllers/@Links/links.spec.ts`

From `frontend`: `npx playwright test e2e/funnel.spec.ts --project=catalog`

Expected: PASS. Falha nova causada por esta etapa é escopo desta etapa.
