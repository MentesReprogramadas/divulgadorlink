# Links, moderação e página pública — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enviar link com cota e pré-recusa, moderar com IA, editar só nome e descrição, publicar a página e o clique em `/go`, com fetch que não alcança rede privada.

**Architecture:** A request grava o caso e enfileira. O worker busca a URL com `safeFetch` e chama o adapter da IA. A IA não bane e não recusa sozinha.

**Tech Stack:** O mesmo da fundação, mais BullMQ para o job `moderate-link`.

## Global Constraints

Herdadas de `docs/superpowers/plans/2026-09-29-catalogo.md`. Envio grátis não consulta pagamento. Host de rede nunca é banido por inteiro.

---

### Task 1: URL canônica e pré-recusa

**Files:**
- Create: `backend/src/domain/links/canonical-url.ts`
- Create: `backend/src/domain/links/canonical-url.spec.ts`
- Create: `backend/src/use-cases/@Moderation/pre-refuse.ts`
- Test: `backend/src/use-cases/@Moderation/pre-refuse.spec.ts`

**Interfaces:**
- Consumes: histórico de `UserIdentifier`
- Produces: `canonicalUrl(raw: string): string`. `preRefuse` com sinais `phone`, `email`, `url`.

- [x] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { canonicalUrl } from '@/domain/links/canonical-url'
import { preRefuse } from '@/use-cases/@Moderation/pre-refuse'

describe('pré-recusa', () => {
  it('não trata outro caminho do mesmo host como o link banido', () => {
    expect(canonicalUrl('https://t.me/exemplo123/')).not.toBe(canonicalUrl('https://t.me/outrocanal'))
  })

  it('dispara por telefone antigo e não dispara por IP', () => {
    const result = preRefuse({
      phoneHistory: ['+5511999999999'],
      bannedPhones: ['+5511999999999'],
      emailHistory: [],
      bannedEmails: [],
      url: 'https://t.me/livre',
      bannedUrls: ['https://t.me/exemplo123'],
      ip: '1.1.1.1',
    })
    expect(result.refused).toBe(true)
    expect(result.signals).toEqual(['phone'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/use-cases/@Moderation/pre-refuse.spec.ts src/domain/links/canonical-url.spec.ts`
Expected: FAIL

- [x] **Step 3: Write minimal implementation**

```ts
export function canonicalUrl(raw: string): string {
  const url = new URL(raw)
  url.protocol = 'https:'
  url.hostname = url.hostname.toLowerCase()
  url.hash = ''
  const kept = new URLSearchParams()
  url.searchParams.forEach((value, key) => {
    if (!key.startsWith('utm_') && key !== 'fbclid') kept.append(key, value)
  })
  url.search = kept.toString() ? `?${kept.toString()}` : ''
  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.slice(0, -1)
  }
  return url.toString()
}
```

```ts
export function preRefuse(input: {
  phoneHistory: string[]
  bannedPhones: string[]
  emailHistory: string[]
  bannedEmails: string[]
  url: string
  bannedUrls: string[]
  ip?: string
}): { refused: boolean; signals: Array<'phone' | 'email' | 'url'> } {
  const signals: Array<'phone' | 'email' | 'url'> = []
  if (input.phoneHistory.some((phone) => input.bannedPhones.includes(phone))) signals.push('phone')
  if (input.emailHistory.some((email) => input.bannedEmails.includes(email))) signals.push('email')
  const url = canonicalUrl(input.url)
  if (input.bannedUrls.map(canonicalUrl).includes(url)) signals.push('url')
  return { refused: signals.length > 0, signals }
}
```

`ip` não entra em `signals`. Comparar host solto (`t.me`, `wa.me`, `instagram.com`, `youtube.com`, `youtu.be`, `discord.com` e os hosts do seed) nunca recusa. A mensagem ao usuário é genérica e não cita o sinal.

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- src/use-cases/@Moderation/pre-refuse.spec.ts src/domain/links/canonical-url.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/domain/links backend/src/use-cases/@Moderation
git commit -m "feat: pré-recusa por identificador e URL exata"
```

---

### Task 2: Envio, cota e lista fechada

**Files:**
- Create: `backend/src/use-cases/@Links/submit-link.ts`
- Create: `backend/src/use-cases/@Links/submit-link.spec.ts`
- Create: `backend/src/domain/links/blocklist.ts`
- Create: `backend/src/http/controllers/@Links/routes.ts`

**Interfaces:**
- Consumes: `canSubmitLink`, `preRefuse`, `canonicalUrl`
- Produces: `decideSubmission`. `POST /api/v1/links` body `{ url, name, description, networkId, nicheId, otherNote? }`.

- [x] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { decideSubmission } from '@/use-cases/@Links/submit-link'
import { hitsBlocklist } from '@/domain/links/blocklist'

describe('envio', () => {
  it('manda Outro para o admin sem IA e ocupa vaga', () => {
    expect(decideSubmission({
      openSlots: 4, networkSlug: 'outro', nicheSlug: 'jogos', blocklisted: false, preRefused: false,
    })).toEqual({ status: 'PENDING_MODERATION', runAi: false, occupiesSlot: true })
  })

  it('recusa o quinto', () => {
    expect(() => decideSubmission({
      openSlots: 0, networkSlug: 'telegram', nicheSlug: 'jogos', blocklisted: false, preRefused: false,
    })).toThrow(/cota/)
  })

  it('trata menção a outro nicho, URL e telefone como lista fechada', () => {
    expect(hitsBlocklist({
      text: 'entra no nicho de Apostas https://x.test 11999999999',
      selectedNiche: 'Jogos',
      nicheNames: ['Jogos', 'Apostas'],
      terms: [],
    })).toBe(true)
  })

  it('lista de termos vazia não marca texto limpo e não publica', () => {
    expect(hitsBlocklist({
      text: 'grupo de jogos',
      selectedNiche: 'Jogos',
      nicheNames: ['Jogos', 'Apostas'],
      terms: [],
    })).toBe(false)
    expect(decideSubmission({
      openSlots: 4,
      networkSlug: 'telegram',
      nicheSlug: 'jogos',
      blocklisted: true,
      preRefused: false,
    }).status).toBe('PENDING_MODERATION')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/use-cases/@Links/submit-link.spec.ts`
Expected: FAIL

- [x] **Step 3: Write minimal implementation**

```ts
const PHONE = /(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}-?\d{4}/
const URL = /https?:\/\/|www\./i

export function hitsBlocklist(input: {
  text: string
  selectedNiche: string
  nicheNames: string[]
  terms: string[]
}): boolean {
  const haystack = input.text.toLowerCase()
  const otherNiche = input.nicheNames
    .filter((name) => name.toLowerCase() !== input.selectedNiche.toLowerCase())
    .some((name) => haystack.includes(name.toLowerCase()))
  const term = input.terms.some((item) => haystack.includes(item.toLowerCase()))
  return otherNiche || term || PHONE.test(input.text) || URL.test(input.text)
}
```

```ts
export function decideSubmission(input: {
  openSlots: number
  networkSlug: string
  nicheSlug: string
  blocklisted: boolean
  preRefused: boolean
}): { status: 'PENDING_MODERATION' | 'PRE_REJECTED'; runAi: boolean; occupiesSlot: boolean } {
  if (input.openSlots <= 0) throw new Error('cota esgotada')
  if (input.preRefused) return { status: 'PRE_REJECTED', runAi: false, occupiesSlot: true }
  const other = input.networkSlug === 'outro' || input.nicheSlug === 'outro'
  if (other || input.blocklisted) return { status: 'PENDING_MODERATION', runAi: false, occupiesSlot: true }
  return { status: 'PENDING_MODERATION', runAi: true, occupiesSlot: true }
}
```

Ordem: cota, pré-recusa, Outro ou detecção determinística, senão a mesma fila de IA. A detecção cobre telefone, URL, nome de outro nicho e os termos de `BlocklistTerm`. A tabela nasce vazia. Termo de golpe ou +18 só existe quando o admin grava. Lista vazia não é controle de segurança: texto limpo segue para a IA, e a IA só publica se `applyAiVerdict` devolver `PUBLISH`. `decideSubmission` nunca devolve `PUBLISHED`. Envio não lê pedido nem pagamento. `otherNote` só o admin lê. Recusa final do admin zera `occupiesSlot`. Remover o link libera a vaga na mesma transação.

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- src/use-cases/@Links/submit-link.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/use-cases/@Links backend/src/domain/links/blocklist.ts backend/src/http/controllers/@Links
git commit -m "feat: envio de link com cota e lista fechada"
```

---

### Task 3: Veredito da IA

**Files:**
- Create: `backend/src/use-cases/@Moderation/apply-ai-verdict.ts`
- Test: `backend/src/use-cases/@Moderation/apply-ai-verdict.spec.ts`
- Create: `backend/src/worker.ts`

**Interfaces:**
- Consumes: `Config.MODERATION_AUTO_APPROVE_THRESHOLD`
- Produces: `applyAiVerdict(verdict, threshold): 'PUBLISH' | 'ADMIN'`. Job `moderate-link`.

- [x] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { applyAiVerdict } from '@/use-cases/@Moderation/apply-ai-verdict'

describe('veredito', () => {
  it('só publica com pass e confiança no limiar recebido', () => {
    const threshold = 0.8
    expect(applyAiVerdict({ pass: true, confidence: 0.9, reasons: [] }, threshold)).toBe('PUBLISH')
    expect(applyAiVerdict({ pass: true, confidence: 0.5, reasons: [] }, threshold)).toBe('ADMIN')
    expect(applyAiVerdict({ pass: false, confidence: 0.99, reasons: ['dúvida'] }, threshold)).toBe('ADMIN')
    expect(applyAiVerdict(null, threshold)).toBe('ADMIN')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/use-cases/@Moderation/apply-ai-verdict.spec.ts`
Expected: FAIL

- [x] **Step 3: Write minimal implementation**

```ts
export function applyAiVerdict(
  verdict: { pass: boolean; confidence: number; reasons: string[] } | null,
  threshold: number,
): 'PUBLISH' | 'ADMIN' {
  if (!verdict || verdict.pass !== true || verdict.confidence < threshold) return 'ADMIN'
  return 'PUBLISH'
}
```

O worker chama `readConfig(rows, 'MODERATION_AUTO_APPROVE_THRESHOLD')` e passa o número para `applyAiVerdict`. O `0.8` do teste é fixture da função pura. Não é o valor de `INITIAL_CONFIG`. JSON inválido, timeout, exceção e URL morta (sem resposta, 404 ou timeout do `safeFetch`) caem em `ADMIN` antes desta função, com `verdict = null`. Host conhecido que responde, mesmo sem o conteúdo do grupo, segue para o modelo. Adulto e Apostas usam o mesmo veredito. A IA não grava `BANNED`. O caso grava o JSON, a confiança, os motivos, os sinais, o limiar lido e o `updatedAt` da config. A request HTTP volta antes do modelo.

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- src/use-cases/@Moderation/apply-ai-verdict.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/use-cases/@Moderation/apply-ai-verdict.ts backend/src/worker.ts
git commit -m "feat: publicação automática só com passe e limiar"
```

---

### Task 4: Edição de nome e descrição

**Files:**
- Create: `backend/src/use-cases/@Links/edit-link-text.ts`
- Test: `backend/src/use-cases/@Links/edit-link-text.spec.ts`

**Interfaces:**
- Consumes: `hitsBlocklist`, `applyAiVerdict`
- Produces: `editLinkText`. Usuário não altera URL, rede nem nicho.

- [x] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { editLinkText } from '@/use-cases/@Links/edit-link-text'

describe('edição', () => {
  it('lista fechada não publica e não chama IA', () => {
    const result = editLinkText({
      publishedName: 'Receitas', nextName: 'pix 11999999999', blocklisted: true, ai: 'PUBLISH',
    })
    expect(result.visibleName).toBe('Receitas')
    expect(result.ranAi).toBe(false)
  })

  it('IA que não passa mantém o texto aprovado', () => {
    expect(editLinkText({
      publishedName: 'Receitas', nextName: 'Bolos', blocklisted: false, ai: 'ADMIN',
    }).visibleName).toBe('Receitas')
  })

  it('IA que passa troca o texto visível', () => {
    expect(editLinkText({
      publishedName: 'Receitas', nextName: 'Bolos', blocklisted: false, ai: 'PUBLISH',
    }).visibleName).toBe('Bolos')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/use-cases/@Links/edit-link-text.spec.ts`
Expected: FAIL

- [x] **Step 3: Write minimal implementation**

```ts
export function editLinkText(input: {
  publishedName: string
  nextName: string
  blocklisted: boolean
  ai: 'PUBLISH' | 'ADMIN'
}): { visibleName: string; ranAi: boolean } {
  if (input.blocklisted) return { visibleName: input.publishedName, ranAi: false }
  if (input.ai === 'PUBLISH') return { visibleName: input.nextName, ranAi: true }
  return { visibleName: input.publishedName, ranAi: true }
}
```

Edição nova substitui a pendente. Recusa do admin restaura o último texto aprovado, não o rascunho intermediário. Destaque não muda de status. O schema do PATCH do dono só aceita `name` e `description`.

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- src/use-cases/@Links/edit-link-text.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/use-cases/@Links/edit-link-text.ts backend/src/use-cases/@Links/edit-link-text.spec.ts
git commit -m "feat: edição de texto com lista fechada na frente da IA"
```

---

### Task 5: Página pública e clique

**Files:**
- Create: `backend/src/use-cases/@Links/open-public-link.ts`
- Create: `backend/src/use-cases/@Links/open-public-link.spec.ts`
- Create: `backend/src/http/controllers/@Links/go.ts`

**Interfaces:**
- Consumes: status do link
- Produces: `openPublicLink`. `GET /go/:linkId` só redireciona a URL já gravada.

- [x] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { openPublicLink } from '@/use-cases/@Links/open-public-link'

describe('página do link', () => {
  it('não abre nem redireciona link indisponível', () => {
    expect(openPublicLink({ status: 'UNAVAILABLE' })).toEqual({ visible: false, redirect: false })
  })

  it('abre o publicado sem contar a abertura como clique', () => {
    expect(openPublicLink({ status: 'PUBLISHED' })).toEqual({ visible: true, redirect: false })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/use-cases/@Links/open-public-link.spec.ts`
Expected: FAIL

- [x] **Step 3: Write minimal implementation**

```ts
export function openPublicLink(link: { status: string }): { visible: boolean; redirect: boolean } {
  if (link.status !== 'PUBLISHED') return { visible: false, redirect: false }
  return { visible: true, redirect: false }
}
```

O DTO público tem `name`, `description`, `niche`, `network`. Não tem e-mail do dono, analytics nem moderação. `/go/:linkId` ignora query `to`. Destino é a URL canônica gravada. Indisponível responde a página de indisponível, sem 302. O clique em si entra no plano 6, em `shouldCount`. Até lá, o handler chama o repositório de analytics se ele existir e redireciona mesmo quando a chave única já existe.

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- src/use-cases/@Links/open-public-link.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/use-cases/@Links/open-public-link.ts backend/src/http/controllers/@Links/go.ts
git commit -m "feat: página pública e redirect de clique"
```

---

### Task 6: Fetch com barreira de SSRF

**Files:**
- Create: `backend/src/adapters/http/safe-fetch.ts`
- Test: `backend/src/adapters/http/safe-fetch.spec.ts`

**Interfaces:**
- Consumes: URL canônica
- Produces: `assertPublicHttps`, `assertResolvedAddresses`, `safeFetch`. Timeout 5s. No máximo 3 redirects.

- [x] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { assertPublicHttps, assertResolvedAddresses } from '@/adapters/http/safe-fetch'

describe('ssrf', () => {
  it('recusa esquema errado, loopback e metadata', () => {
    expect(() => assertPublicHttps('http://example.com')).toThrow(/https/)
    expect(() => assertPublicHttps('https://127.0.0.1')).toThrow(/privado/)
    expect(() => assertPublicHttps('https://169.254.169.254')).toThrow(/privado/)
  })

  it('recusa o endereço resolvido mesmo se o host parecer público', () => {
    expect(() => assertResolvedAddresses(['10.0.0.8'])).toThrow(/privado/)
    expect(assertResolvedAddresses(['8.8.8.8'])).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/adapters/http/safe-fetch.spec.ts`
Expected: FAIL

- [x] **Step 3: Write minimal implementation**

```ts
import { isIP } from 'node:net'

function isPrivate(host: string): boolean {
  if (host === 'localhost' || host.endsWith('.local')) return true
  if (!isIP(host)) return false
  const [a, b] = host.split('.').map(Number)
  if (a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) {
    return true
  }
  return host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')
}

export function assertPublicHttps(raw: string): true {
  const url = new URL(raw)
  if (url.protocol !== 'https:') throw new Error('somente https')
  if (url.port && url.port !== '443') throw new Error('porta')
  if (isPrivate(url.hostname)) throw new Error('destino privado')
  return true
}

export function assertResolvedAddresses(addresses: string[]): true {
  if (addresses.some(isPrivate)) throw new Error('destino privado')
  return true
}
```

`safeFetch` chama `assertPublicHttps`, resolve o DNS, chama `assertResolvedAddresses`, e repete os dois a cada redirect. No quarto redirect, para. Timeout 5000 ms. Corpo limitado. O worker de moderação é o único chamador.

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- src/adapters/http/safe-fetch.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/adapters/http
git commit -m "feat: fetch de URL com bloqueio de SSRF"
```

## Gate deste plano

`npm test` passa. Envio com conta banida não cria link. `https://127.0.0.1` não gera request de saída. Página pública de teste não contém e-mail.

## Status de implementação

Reconciliado em 2026-09-30 (Task 10), contra o código e as suítes do mesmo dia: backend `npm test` 198/198 (50 arquivos), `test:pg` 30/30, frontend 7/7, Playwright 15/15 em duas execuções seguidas (uma terceira anterior teve 1 falha intermitente, ver plano 07), typecheck, lint, build e `npm audit --audit-level=high` sem vulnerabilidade nos dois workspaces.

Regra das marcas: Step 1 e Step 3 marcados quando o spec e a implementação declarados existem; Step 4 marcado quando o spec passa numa dessas suítes. Step 2 ("ver falhar") é histórico e não se prova retroativamente: fica `[ ]`. Step 5 (commit) não foi executado por instrução: fica `[ ]`. Nenhum histórico foi apagado.

| Task | Status | Evidência |
|---|---|---|
| Task 1: URL canônica e pré-recusa | PASS | `canonical-url.spec.ts`, `pre-refuse.spec.ts` |
| Task 2: Envio, cota e lista fechada | PASS | `submit-link.spec.ts` |
| Task 3: Veredito da IA | PASS (domínio e worker com adapter fake) / BLOCKED_EXTERNAL (OpenAI real) | `apply-ai-verdict.spec.ts`, `text-proposed-worker.pg.spec.ts` (PG, Redis e BullMQ reais). Sem `OPENAI_API_KEY` |
| Task 4: Edição de nome e descrição | PASS | `edit-link-text.spec.ts` |
| Task 5: Página pública e clique | PASS | `open-public-link.spec.ts`; sonda de vazamento em 10 endpoints públicos sem achado |
| Task 6: Fetch com barreira de SSRF | PASS | `safe-fetch.spec.ts` |
