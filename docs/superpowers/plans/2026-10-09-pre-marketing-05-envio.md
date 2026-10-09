# Envio de link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O envio recusa host incompatível, URL duplicada e URL que não responde; a tela diz “Enviado para análise”; o botão não dispara duas vezes; a pessoa vê as vagas; o texto sobrevive a um reload.

**Architecture:** A regra de host é função pura `hostMatchesNetwork`. A duplicata é consulta na transação de `createWithinQuota`. A vida da URL usa `safeFetch` com a regra de status abaixo, para não tratar bloqueio de WAF como link morto. O rascunho é `localStorage`, não o status `DRAFT`, porque `DRAFT` no banco abriria cota e moderação sem necessidade.

**Tech Stack:** Vitest, Fastify, Playwright.

## Global Constraints

- `knownHosts` vazio (`site`, `outro`) não valida host.
- Host casa se for igual a um item ou se terminar com `.{item}`, comparação em minúsculas, sem porta.
- Duplicata: mesma `canonicalUrl` no tenant com `occupiesSlot = true`. Resposta 409, mensagem `Esse link já está no catálogo.` Não gravar outra linha.
- Vida da URL: `safeFetch` com o resolver DNS real. Status 200–399 conta como viva. 401, 403, 405 e 429 contam como viva, porque rede social bloqueia o servidor. 404, 410 e erro de conexão ou DNS contam como morta e respondem 422 `Não foi possível abrir essa URL.` sem ocupar vaga.
- Timeout máximo 5 s, o que `SAFE_FETCH_TIMEOUT_MS` já usa.
- A palavra `Publicado` não aparece na resposta de sucesso do formulário.
- Cota continua 4. A tela mostra “Vagas em uso: N de 4.” vindo de `GET /api/v1/links/mine`, que passa a incluir `slotsUsed`.

---

### Task 1: Host

**Files:**
- Create: `backend/src/domain/links/network-host.ts`
- Test: `backend/src/domain/links/network-host.spec.ts`
- Modify: `backend/src/http/controllers/@Links/routes.ts`
- Modify: `backend/src/http/controllers/@Links/links.spec.ts`

**Interfaces:**
- Produces: `hostMatchesNetwork(hostname: string, knownHosts: string[]): boolean`. Lista vazia retorna true.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { hostMatchesNetwork } from '@/domain/links/network-host'

describe('host da rede', () => {
  it('aceita o host e o subdomínio', () => {
    expect(hostMatchesNetwork('instagram.com', ['instagram.com'])).toBe(true)
    expect(hostMatchesNetwork('www.instagram.com', ['instagram.com'])).toBe(true)
  })

  it('recusa outro host e aceita rede sem lista', () => {
    expect(hostMatchesNetwork('instagram.com', ['t.me', 'telegram.me'])).toBe(false)
    expect(hostMatchesNetwork('exemplo.com', [])).toBe(true)
  })
})
```

E no `links.spec.ts`: body com `networkId` de Telegram e URL `https://instagram.com/x` responde 422 e não aumenta `repo().links`.

- [ ] **Step 2: Run and confirm FAIL**

- [ ] **Step 3: Implement and call it after `assertPublicHttps`**

O repositório precisa devolver `knownHosts` em `findNetwork`. Se o tipo atual não tem o campo, acrescentar no select e no tipo em memória usado pelo spec.

- [ ] **Step 4: Run `network-host.spec.ts` and `links.spec.ts`**

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/domain/links/network-host.ts backend/src/domain/links/network-host.spec.ts backend/src/http/controllers/@Links/routes.ts backend/src/http/controllers/@Links/links.spec.ts backend/src/repositories/links-repository.ts
git commit -m "fix: recusa url de outra rede"
```

### Task 2: Duplicata e vida da URL

**Files:**
- Modify: `backend/src/repositories/links-repository.ts`
- Modify: `backend/src/http/controllers/@Links/routes.ts`
- Modify: `backend/src/adapters/http/safe-fetch.ts` só se faltar um helper de classificação de status. Preferir função nova `urlAvailability(status: number | null): 'alive' | 'dead'` em `backend/src/domain/links/url-availability.ts`.
- Test: `backend/src/domain/links/url-availability.spec.ts` e caso novo em `links.spec.ts`

```ts
export function urlAvailability(status: number | null): 'alive' | 'dead' {
  if (status === null) return 'dead'
  if (status >= 200 && status < 400) return 'alive'
  if (status === 401 || status === 403 || status === 405 || status === 429) return 'alive'
  return 'dead'
}
```

`createLink` chama `safeFetch` só depois do host válido. Nos testes HTTP em memória, injetar `setLinkProbeForTest` que não faz rede. O teste de 404 usa o probe e espera 422 com zero links novos. O teste de 403 espera 201. O teste de URL já ocupada espera 409.

Produção usa o probe default com `safeFetch` e `dns.promises.resolve`. Não seguir redirect para host privado: `safeFetch` já resolve de novo a cada redirect.

- [ ] **Step 1: Write failing tests for status class, duplicate 409 and dead 422**

- [ ] **Step 2: Run and confirm FAIL**

- [ ] **Step 3: Implement**

A checagem de duplicata fica dentro da transação serializável de `createWithinQuota`, antes do insert. Fora da transação, duas requests paralelas ainda podem passar. A transação serializável mais a consulta `canonicalUrl` cobre o caso. Se o Prisma devolver erro de serialização, responder 409 com a mesma mensagem.

- [ ] **Step 4: Run the specs**

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/domain/links/url-availability.ts backend/src/domain/links/url-availability.spec.ts backend/src/repositories/links-repository.ts backend/src/http/controllers/@Links
git commit -m "fix: impede url duplicada ou inacessível"
```

### Task 3: Tela, vaga, botão e rascunho

**Files:**
- Modify: `frontend/src/app/painel/links/novo/page.tsx`
- Modify: o handler de `GET /mine` para incluir `slotsUsed`
- Test: `frontend/e2e/submit-link.spec.ts` e um teste de componente se já houver padrão em `frontend/src/app/painel`. O E2E é a prova.

Playwright, usuário já verificado do `auth.setup`:

- Abrir `/painel/links/novo`, ver “Vagas em uso:”.
- Preencher nome e descrição, recarregar, ver os valores de volta.
- Enviar URL `https://example.com` na rede `site` (lista vazia). Ver heading ou status `Enviado para análise.` e não ver o texto `Publicado`.
- O botão fica disabled durante o request. No teste, interceptar o POST e segurar a resposta; assert `toBeDisabled()`.
- Segundo envio da mesma URL mostra o alerta `Esse link já está no catálogo.`

`localStorage` key `tla-link-draft`, JSON `{ name, description, url, networkId, nicheId }`. Limpar a chave no 201.

- [ ] **Step 1: Write the failing Playwright test**

- [ ] **Step 2: Run and confirm FAIL**

- [ ] **Step 3: Implement the page states**

Trocar o ramo `setStatus('Publicado')` por nada: 201 com `PENDING_MODERATION` ou qualquer 201 que não seja erro mostra só “Enviado para análise.” e um link “Ver meus links” para `/painel/links`. 422 e 409 mostram `message` em `role=alert`.

- [ ] **Step 4: Run the Playwright file**

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/painel/links/novo/page.tsx frontend/e2e/submit-link.spec.ts backend/src/http/controllers/@Links/routes.ts
git commit -m "feat: confirma o envio sem chamar de publicação"
```

### Task 4: Confirmação da etapa

- [ ] **Step 1: Run**

From `backend`: `npx vitest run src/domain/links/network-host.spec.ts src/domain/links/url-availability.spec.ts src/http/controllers/@Links/links.spec.ts`

From `frontend`: `npx playwright test e2e/submit-link.spec.ts --project=catalog`

Expected: PASS. Se o probe de rede no E2E tentar sair para a internet e falhar, o teste usa a rede `site` com probe de teste já coberto no unitário, e o E2E intercepta `POST /bff/v1/links` só para o caso do botão. O caso de sucesso do E2E precisa do backend real: usar `https://example.com`, que responde 200. Se o ambiente de teste não tiver saída, marcar o probe do servidor de E2E com a mesma classificação e um host fixture documentado no `global-setup`. Não desligar a checagem em produção para o teste passar.
