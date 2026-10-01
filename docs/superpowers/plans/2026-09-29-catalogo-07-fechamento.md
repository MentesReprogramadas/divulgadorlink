# Fechamento do produto — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ligar browser, Next, API, use case, Postgres, Redis/worker e o webhook vigente da Woovi, e só então chamar o produto de fechado.

**Architecture:** O monólito modular permanece. O frontend fala só com a API. O tenant continua saindo do host. Prova de checkout e de analytics é linha no PostgreSQL, não store em memória. A assinatura do webhook fica no adapter.

**Tech Stack:** Next.js 15.3.8, React 19, Tailwind 4, Playwright, Fastify 5, Prisma 6.0.1, PostgreSQL 16 + pgvector, Vitest 5.0.2, Vite 6.4.3.

Baseline medido em `940d5e3`, branch `feat/catalogo`. Este plano não está executado. Marcar um checkbox sem o teste da task verde reabre a task.

## Global Constraints

Herdadas do mapa. Não mudar `priceFor`, `rankSearch`, `assertCheckout` nem `transition`. Não criar `SEARCH_HOME`, `NICHE_HOME`, superfície `CATEGORY`, leilão, boleto, cauda de nicho, cron, job de 12 meses, job de 5 anos, hash de e-mail ou telefone. `BAN_AFTER_DELETION` continua `pending`. Audit continua `npm audit --audit-level=high`, sem exceção e sem `audit fix --force` que volte o HyperDX para `0.6.2`. Sem push.

## Inventário medido

Existe e está coberto por teste de unidade ou HTTP em memória: fundação, links, moderação, busca, checkout, renovação, banimento, 146 testes, typecheck 0, ESLint em `backend/src`, `prisma generate` depois de soltar o lock do `prove-bootstrap.ts`.

Existe no disco e não está provado no Postgres desta sessão: as 10 migrations, inclusive `20260929235000_analytics_events`. O checkout de produção usa `PrismaCheckoutStore` com `$queryRawUnsafe`. `runtimeCheckoutStore()` devolve memória quando `NODE_ENV=test`.

Não existe: pasta `frontend/`, Playwright, gravação em `analytics_events`, `POST /auth/refresh`, `POST /auth/logout`, página pública HTTP do link, leitura de CTR, lista de usuários, redes, relatórios, auditoria e pedidos no admin. `PATCH /links/:id`, troca de e-mail e troca de telefone ainda passam por `postGuardedWrite` e respondem 409 para conta ativa.

Webhook: a rota aceita `x-openpix-signature` (HMAC-SHA1). A documentação vigente da Woovi recomenda `x-webhook-signature` (RSA-SHA256, chave pública). HMAC não fecha o plano.

Audit: dois HIGH transitivos de `@hyperdx/node-opentelemetry@0.11.0` — `@opentelemetry/sdk-node` e `@opentelemetry/propagator-jaeger`. O gate está vermelho.

Observabilidade: `logDomainEvent` ainda é `console.info`.

---

### Task 1: Assinatura vigente da Woovi

**Files:**
- Modify: `backend/src/adapters/payments/woovi-webhook-signature.ts`
- Modify: `backend/src/http/controllers/@Payments/routes.ts`
- Test: `backend/src/adapters/payments/woovi-webhook-signature.spec.ts`
- Test: `backend/src/http/controllers/@Payments/checkout.spec.ts`

- [x] **Step 1:** Teste que rejeita corpo alterado, header ausente, assinatura inválida e chave trocada, e aceita RSA-SHA256 em `x-webhook-signature`.
- [x] **Step 2:** A rota deixa de aceitar HMAC e o header `x-test-signature` como autenticidade.
- [x] **Step 3:** `npm test` do webhook e do checkout passa. HMAC sozinho responde 400 e não cria promoção.

A chave pública publicada pela Woovi é o padrão de produção. Teste usa um par gerado no spec, via `WOOVI_WEBHOOK_PUBLIC_KEY`. O use case de confirmação não ganha `if (test)`.

### Task 2: Analytics persistido

**Files:**
- Modify: `backend/src/use-cases/@Analytics/record-event.ts`
- Create: repositório que insere em `analytics_events`
- Test: integração contra Postgres vazio, depois das 10 migrations

- [x] Gravar impressão e clique. Conflito da chave única `(sessionId, linkId, surface, day, kind)` é sucesso e não duplica. Provado em `analytics.pg.spec.ts` contra Postgres, inclusive duas requisições simultâneas.
- [x] Dono e admin não geram linha. Link de outro tenant, indisponível, banido ou inexistente não gera linha.
- [x] CTR do dono lê as linhas. Sem número fixo na resposta. `GET /api/v1/analytics/links/:linkId` devolve contagens do `SELECT`.
- [x] `migrate deploy` num Postgres vazio aplica as 10 migrations, inclusive analytics, pgvector e os dois índices parciais. Container `divulgador-analytics-pg` na porta 5433, removido depois da prova.

### Task 3: Checkout HTTP no PostgreSQL

**Files:**
- Test: `backend/src/http/controllers/@Payments/checkout.pg.spec.ts`
- Modify: `backend/src/use-cases/@Promotions/checkout-prisma.ts` para usar o client gerado onde a operação existir no schema

- [x] Duas requisições simultâneas da mesma superfície: uma pending, a outra 409, um charge, `23505` vira `CheckoutConflictError`. Provado em `checkout.pg.spec.ts`. O corpo não contém `23505`.
- [x] Mesma `Idempotency-Key` não cria segundo pedido, inclusive com payload diferente: devolve o pedido já gravado. Preço no corpo é 400. Outro tenant 403, outro dono 404, conta banida 403 sem charge.
- [x] O teste sobe um Postgres descartável. Não usa `InMemoryCheckoutStore`. Webhook, replay, Pix tardio e falha do gateway também passam nesse banco. Falha do gateway apaga o pedido sem charge.

### Task 4: Contratos HTTP que a vitrine consome

Só rotas cuja regra já está no use case. Onde a rota hoje é 409 permanente (`link.update`, e-mail, telefone), a task liga o use case existente. Não inventar relatório, lista de redes ou cancelamento de destaque sem regra no mapa.

- [x] `POST /auth/refresh` e `POST /auth/logout`. Cookie `refreshToken` HttpOnly, Secure em produção, SameSite=Lax. O JSON não leva o refresh. Rotação revoga o `jti` anterior; replay e logout seguinte respondem 401. JWT de outro tenant no host responde 403.
- [x] `GET /api/v1/links/:id` público. Publicado devolve nome, descrição, nicho, rede, SEO e `goPath`. Indisponível devolve `available: false` sem nome, URL nem motivo. Inexistente e outro tenant respondem o mesmo 404.
- [x] `POST /analytics/impressions` e clique só por `GET /go/:linkId`. Abrir a página não é clique. A página pública emite token `organic` para a impressão.
- [x] Superfície assinada na listagem. HMAC com chave derivada do segredo do servidor, amarrada a tenant, link e origem. Home, busca, autocomplete, nicho e rede emitem o token. O segredo não vai no JSON.

Prova: `catalog.http.spec.ts` e `surface-token.spec.ts`. `npm test` 157. Typecheck 0. ESLint 0. Sem frontend.

Ainda 409, de propósito: `POST /links/account/email` e `POST /links/account/phone`. Não há use case de troca de identificador. A vitrine não deve chamar essas rotas.

Edição: `PATCH /links/:id` só aceita `name` e `description`. Lista fechada não troca o texto. Sem veredito de IA o nome público permanece e a proposta fica em `audit_logs` (`link.text.proposed`). `setEditVerdictForTest('PUBLISH')` prova o caminho que grava. O request HTTP não chama o modelo. Não existe worker lendo essa proposta.

Checkout: `GET /orders/:orderId` expõe `chargeStarted` sem id de gateway. O risco da Task 3 continua: a order pode commitar e o processo morrer antes do charge. `chargeStarted: false` com `PENDING_PAYMENT` é esse estado. O fluxo de pagamento não foi reescrito.

CI: `PG_SPECS` continua fora do pipeline. `npm test` não executa `*.pg.spec.ts`. Os specs de Postgres existem e precisam entrar no CI antes do fechamento. Não estão cobertos agora.

### Task 5: Frontend integrado

**Files:** `frontend/` com Next 15.3.8, React 19, tokens, e as camadas `ui`, `forms`, `feedback`, `domain`.

- [x] Home, página do link, cadastro, login, painel, destaque, moderação e estornos estão no código, o `next build` passa e a Task 6 exercitou essas telas no browser contra a API. Contestação tem rota e não entrou na suíte. Autocomplete usa `GET /search/suggest` na busca; o ranking semântico não rodou (sem `OPENAI_API_KEY`, a busca responde 503).
- [x] A tela de destaque mostra o preço devolvido pelo backend (`R$ 7,90` para SEARCH 7 dias). `SEARCH`+`HOME` recebe `Combinação não está disponível` e não cria pedido. Sem botão de simular pagamento. O browser não renderiza `brCode`.
- [x] Admin de estorno mostra a lista vazia. Não há botão de simular pagamento. `REFUND_FAILED` não foi exercitado no browser: o Pix de teste confirmou `PAID`, não estorno.
- [x] A Task 5 não tinha tela de troca. A Task 7 ligou o use case já previsto: o painel pede o novo e-mail ou telefone, a API não devolve o código, o identificador anterior fica com `replacedAt` e o publicado continua no ar. O browser só exercitou o e-mail.

Tailwind 4 não entrou. O CSS usa os tokens em `frontend/src/styles/tokens.css`. Colocar Tailwind agora só para cumprir o nome da ferramenta, sem componente que dependa dele, seria dependência morta.

### Task 6: Playwright

`npx playwright test` em `frontend/` : 13 passaram (a 13ª é a troca de e-mail). Next `15.5.26`. Caminho real: Chromium → Next (`next start`) → BFF → API (`NODE_ENV=dev`) → PostgreSQL `divulgador-e2e-pg` em `127.0.0.1:5433` e Redis `6380`. Webhook com `x-webhook-signature` RSA-SHA256 sobre o body cru. Sem `x-test-signature`. A suíte não foi commitada.

- [x] `npm run test:e2e` passa nesta máquina: cadastro, login, refresh (cookie gira, `jti` antigo 401), logout idempotente, criação de link, SSRF de host privado, edição publicada só como proposta, home/SEO/nicho/rede, indisponível e 404, analytics com deduplicação, clique e open redirect, checkout, webhook RSA, replay, assinatura inválida, admin (cookie `catalogo_role` não autoriza), IDOR, isolamento de tenant, XSS, mobile.
- [ ] Busca semântica, cutoff e `embeddingState` no browser. Sem chave OpenAI a API responde 503 `Busca indisponível.` O autocomplete e o estado de erro passaram.
- [x] Pix expirado no browser. O checkout real ainda enfileira `expire-pix` com 1800s. O relógio global não foi mexido. A Task 7 provou o worker BullMQ à parte, com `expiresAt` já vencido, fora desta suíte. **Task 10:** teste Playwright "Pix expirado no browser" (worker real expira, hold `RELEASED`, 0 promoção, a tela esconde o código, nova tentativa gera outro pedido) e `scripts/prove-pix-expiration.ts` com `PIX_EXPIRATION_SECONDS=3` (API e worker reais por HTTP; expirou em ~3,3 s).
- [x] Submit não abre `ModerationCase`. `link.text.proposed` agora entra na fila `text-proposed`, mas o job não foi consumido num teste e não há adaptador de modelo. Sem veredito de IA o texto público não troca. A aprovação/rejeição do browser usa casos semeados. **Task 10:** `text-proposed-worker.pg.spec.ts` consome o job com PG, Redis e BullMQ reais e adapter fake determinístico (PUBLISH, ADMIN, falha com 3 tentativas → ADMIN, timeout do `OpenAiTextModeration` real → ADMIN, sem adapter → ADMIN). Não é prova do OpenAI real.

### Task 7: Audit e observabilidade

- [x] Task 9: audit 0/0 nos dois workspaces, sem downgrade do HyperDX e sem Next 16 (detalhe na Task 9).
- [ ] (histórico, Task 7) Audit continua vermelho. Backend: 2 high e 25 moderate via `@hyperdx/node-opentelemetry@0.11.0`, última estável; o force ainda quer `0.8.2`. Não houve downgrade. Frontend: o critical do Next saiu ao ir para `15.5.26` (build e Playwright 13 passaram depois do `npm ci`). Restam 2 high (`postcss`, `sharp`) e 3 moderate. `npm audit fix --force` agora quer `next@16`. Não foi aplicado. Busca semântica, veredito de IA e o workflow no Linux continuam sem prova. A Task 7 não fecha o plano.
- [x] `http.completed` registra `request_id`, tenant (host), entidade (método e rota) e `duration_ms`. `sanitizeLog` continua cortando senha, hash, JWT, secret, código, PAN, e-mail e telefone.
- [x] Não há arquivo de exceção.

### Task 8: Ambiente limpo

- [ ] `npm ci` do backend e do frontend saiu 0 nesta máquina. O postinstall do Prisma foi bloqueado por `allowScripts`; `npx prisma generate` rodou em seguida. Depois: `npm test` 165, `test:pg` 19, Playwright 13, typecheck, lint e build. O audit no mesmo ambiente continua vermelho (backend 2 high + 25 moderate; frontend 2 high + 3 moderate). Por isso este item não fecha.
- [x] O CI tem `prisma migrate deploy`, `npm run test:pg` com `PG_SPECS=1`, o job `web` e o job `e2e` (`npm run test:e2e`). O audit do backend ficou no fim do job `verify`, sem `continue-on-error`, e continua capaz de falhar o job. O workflow não foi executado: não houve push.

## Gate deste plano

O plano não fecha com frontend ausente, analytics sem linha, checkout só em memória, HMAC no lugar de RSA, Playwright ausente, audit vermelho ou migration não aplicada em banco vazio.

### Task 9: Fechamento com evidência (2026-09-30)

- [x] Sessão: `accessToken` e `refreshToken` em cookie HttpOnly, nada em `sessionStorage`, nenhum `token` no JSON de register/login/refresh. `GET /auth/session` devolve `{role,status,canSubmit}`. CSRF double-submit (`csrf` legível × `x-csrf-token`, `timingSafeEqual`) em toda mutação autenticada por cookie; Bearer segue aceito. Bug achado pelo teste novo: `verifyJWT` copiava o cookie para `Authorization` e com isso pulava o CSRF — corrigido (`readAccessUser`). Analytics ignorava o cookie (dono contado como visitante, stats 401) — corrigido e provado no PG. Build de produção (`node build/server.js`): sem header 403, header errado 403, header certo 401 no refresh inválido.
- [x] Paginação keyset (`limit` padrão 24, máx 50, `cursor` inválido 400). Provado no PG com empates e timezone `America/Sao_Paulo`. `EXPLAIN ANALYZE` com 100 mil links e 20,2 mil promoções: patrocinados 358 ms → 0,9 ms depois de reescrever a query a partir de `promotions` (usa `promotions_surface_status_activatedAt_idx`); orgânico em página profunda 0,14 ms (`links_pkey`).
- [x] Pix copia e cola: `orders.brCode` (migration `20260930140000`), `GET /orders/:id` devolve, lista não devolve. Browser mostra o código e o recupera após reload.
- [x] Recuperação de cartão: 5 testes com provider fake idempotente (sem gateway, cobrado uma vez, timeout libera lock e reaproveita intent, lock alheio, charge existente). Integração Stripe real: sem chave.
- [x] Moderação: `settleProposedText` provado no PG (PUBLISH + audit, SKIPPED na reexecução, sem provider ou provider com erro → ADMIN, threshold ausente lança). Adapter OpenAI com 5 testes de contrato. Chamada real: sem chave.
- [x] Busca semântica: sem fallback textual; sem chave responde 503; timeout de 3 s testado. E2E com provider real: sem chave.
- [x] Audit: backend 0 (era 2 high + 25 moderate) via `overrides` do `@opentelemetry/*` 2.11.0, provado com `scripts/prove-hyperdx.ts` (traces, logs e metrics exportados, `uber-trace-id` malformado não derruba). Frontend 0 (era 2 high + 3 moderate): `postcss` 8.5.28 por override, `sharp` 0.35.5, `vitest` 5.0.3.
- [x] CI: `npm ci` do backend falhava no Node 22/npm 10 (ERESOLVE `@eslint/js@10` × `eslint@9`, vindo do HEAD). `@eslint/js` alinhado a `^9.39.5`, que é a versão que o próprio eslint 9.39.5 usa; lock sem `--legacy-peer-deps`. O Postgres do CI foi para a 5433 porque `prove-pix-worker` grava ali. `prove-pix-worker` travava em Linux (neto `node` sobrevivia ao kill e segurava o pipe) — `detached` em POSIX. Jobs `verify` e `web` executados em `node:22` Linux com Postgres/Redis isolados: 184 + 25 + 7 testes, build e audit 0. O job `e2e` não rodou em Linux. O workflow remoto não rodou: sem `gh`, sem push.
- [x] Middleware do Next usava `127.0.0.1:3333` fixo: em deploy com API em outro host toda página `/link/*` quebraria. Agora lê `API_ORIGIN`/`TENANT_HOST`.
- [ ] Provedores reais: OpenAI (busca e moderação), Stripe (cartão), refund real Woovi/Stripe, entrega real de e-mail/SMS (o fluxo foi provado só pelo inbox de teste, que não existe em `NODE_ENV=production`).
- [ ] `BAN_AFTER_DELETION`: decisão de produto.

Números finais: backend 184 (47 arquivos), PG 25 (3), frontend 7 (3), Playwright 14/14, builds OK, audit 0/0.

### Task 10: Preparação final (2026-09-30)

- [x] Pix com TTL configurável só fora de produção: `PIX_EXPIRATION_SECONDS` inteiro de 3 a 1800; produção recusa subir com a variável; padrão 1800.
- [x] Worker `text-proposed` ponta a ponta (ver Task 6). Contrato: `attempts: 3`, backoff exponencial de 1 s, só a última tentativa cai em ADMIN `error`; nunca publica em falha.
- [x] Typecheck do e2e: 3 erros → 0, sem `as any`. `npm run typecheck` do frontend cobre `e2e/tsconfig.json`.
- [x] Jobs órfãos `expire-*`: limpeza por correlation id nas provas, sem limpeza global; depois da prova só ficam as chaves meta da fila, nenhum worker vivo, o script sai sozinho.
- [x] Artefatos pnpm (`pnpm-lock.yaml`, `pnpm-workspace.yaml` com placeholders) movidos para fora do repositório e ignorados. npm é o gerenciador oficial (`package-lock.json`, CI com `npm ci`).
- [x] Tela de destaque: chave de idempotência nova por tentativa (a determinística bloqueava a recompra depois de expirar) e status real do pedido (`Pix expirado` esconde o código).
- [x] Consumidores de `{token}` no JSON: nenhum. Cookie sem `maxAge` mantido e documentado no spec (seção 2): `SESSION COOKIE = browser session cookie`, `REFRESH TOKEN EXPIRATION = 7 days`.
- [x] Endpoints públicos: sonda em home, nicho, rede, busca, sugestão, página do link (disponível e indisponível), `/go` e analytics anônimo contra 23 valores sensíveis do banco (ids de dono e tenant, e-mails, telefones, URLs canônicas, brCodes, ids de cobrança, hashes bcrypt, nomes ocultos) e chaves proibidas: 0 achado.
- [x] Sem credencial não há chamada externa: embedding sem `OPENAI_API_KEY`, Woovi sem `WOOVI_APP_ID` e Stripe sem `STRIPE_SECRET_KEY` falham explicitamente antes do `fetch` (antes, a busca chamava a OpenAI com `Bearer ` vazio a cada pesquisa e o Stripe subia com `sk_missing`).
- [x] E-mail/SMS: portas `EmailProvider`/`SmsProvider`, inbox de teste só fora de produção, adapter de produção "não selecionado", timeout de 5 s, 2 tentativas, log `notification.delivery` sem código e sem destino. O código só é gravado depois da entrega: falha não consome o limite de reenvio. Prova HTTP em `NODE_ENV=production` (mesmo com `CONFIRMATION_INBOX=1`): cadastro → 503 `provider_error`, 0 código gravado, 0 cookie de sessão.
- [x] EXPLAIN com 100k links, 90k embeddings e 500k eventos, SQL exato de produção (`scripts/explain-hot-paths.ts`, mediana de 5): home patrocinado 0,67 ms, orgânico 0,08-0,10 ms, nicho 1,6-3,6 ms, rede 0,15-0,24 ms. Analytics `totals` 20 ms (Seq Scan) → 0,029 ms com a migration `20260930180000_analytics_link_totals_index`, testada em banco vazio e em banco com 500k linhas.
- [x] `loadProduction` do catálogo (sem `LIMIT`, duas subqueries por linha) era código morto e foi removido.
- [ ] Busca híbrida: 195-203 ms com 100k links, Parallel Seq Scan, sem `LIMIT`; o HNSW `links_embedding_hnsw_idx` não é usado. Projeção linear: ~2 s com 1M. Corrigir muda o conjunto de candidatos do `rankSearch`. **Task 11:** a medição era de EXPLAIN (plano custom); via Prisma, a partir da 6ª execução por conexão o plano genérico leva ~2,07 s com 100k. Ver `2026-09-29-catalogo-search-architecture.md`.
- [ ] Sugestão (`ILIKE '%q%'`): 21 ms com 100k links, Seq Scan. Candidato a índice trigram quando houver volume.
- [x] Troca de e-mail/telefone: checa se o valor está livre, entrega o código ao destino novo e só então substitui o identificador e grava o hash. Falha de entrega mantém o identificador confirmado atual (teste; a mutação que devolve a ordem antiga falha exatamente esse teste). Valor de outra conta falha antes de qualquer envio. A corrida entre a checagem e a troca continua coberta pela transação e pelo índice único; no pior caso um código chega a um endereço que outra conta tomou no mesmo instante e não confirma nada.
- [ ] Playwright: 1 falha intermitente em 3 execuções completas (`admin não confia no cookie…`, `asBia` caiu no login). As duas seguintes passaram 15/15. A trace da falha foi sobrescrita; sem causa raiz. **Task 11:** dois defeitos de harness reproduzidos e corrigidos (ver Task 11); a falha histórica exata continua sem prova de atribuição.
- [ ] E2E em Linux: o `globalSetup` cria containers pelo Docker em `127.0.0.1:5433/6380`; em container exigiria o socket do Docker e host network. `CI E2E Linux remote execution pending push`.

Task 9, 2026-09-30: `PLAN = OPEN`. Bloqueios apenas externos: credenciais de provedores, execução remota do CI e decisão de produto.

Task 10, 2026-09-30: `PLAN = OPEN`. `LOCAL IMPLEMENTATION = COMPLETE` não se aplica: restam a intermitência do Playwright (local, sem causa raiz) e a busca híbrida em escala (depende de decisão de arquitetura).

### Task 11: Busca híbrida e Playwright (2026-10-01)

- [x] Playwright, matriz antes da correção: 7/7 execuções completas 15/15 (1 worker, que é a configuração normal; serial e 1 worker coincidem com ela). Teste `admin não confia…` sozinho: 1/1 falha; repetido 5×: 5/5 falhas. Causa: `bia.storage.json` gravado pelo teste `login, refresh e sessão mínima` e lido por 7 testes; sozinho, o arquivo é de um seed anterior (token com outro `tenantId`, vencido) e o `asBia` cai no login. Dependência de ordem, determinística.
- [x] Playwright, servidores órfãos: execução interrompida no meio deixa Next/API/stub vivos; a suíte seguinte não sobe os seus (porta ocupada, sem erro) e o `globalSetup` aceita o Next velho como pronto. O limitador de login em memória da API órfã acumula: na 3ª suíte sobre os órfãos, login da Bia → 429 (confirmado direto na API), o teste de login falha e 9 testes caem em cascata no mesmo sintoma (`asBia` → login). O `serve.pid` era sobrescrito, então nem o teardown seguinte limpava.
- [x] Correção (sem retry, sem timeout maior, sem mudar assert): `globalSetup` falha em 2 s se 3000/3333/4099 estiverem ocupadas, sem matar nada (PID pode ter sido reciclado); `serve.mjs` sai com erro se o stub não sobe; sessão da Bia gerada pelo projeto `setup` (`e2e/auth.setup.ts`) e não mais pelo teste de login; `asBia` falha com mensagem explícita se o arquivo é de outro seed ou venceu.
- [x] Depois da correção: teste `admin` sozinho passa; repetido 5×, o `asBia` passa nas 5 e as repetições 2-5 falham na pré-condição do banco (o teste fecha o caso de moderação do seed: é de uso único, não intermitente); cenário de órfãos falha na hora com a mensagem; 5/5 suítes completas 16/16.
- [ ] Falha histórica da Task 10: o mecanismo reproduzido dá o mesmo sintoma, mas não o mesmo padrão (1 falha isolada contra cascata). Trace perdida; atribuição não provada.
- [ ] Busca híbrida: `DECISION_REQUIRED`. Ver `2026-09-29-catalogo-search-architecture.md` (benchmark sintético 10k/100k, recall contra a baseline, plano genérico 10× mais lento, contrato sem limite como gargalo estrutural). Nada implementado.
- [x] Contratos `priceFor`, `rankSearch`, `assertCheckout`, `transition`: assinaturas e corpos sem alteração.

Task 11, 2026-10-01: `PLAN = OPEN`. `LOCAL IMPLEMENTATION = NOT COMPLETE`: busca híbrida `OPEN — ARCHITECTURE DECISION REQUIRED`, com bug de plano genérico identificado e não corrigido (fora do escopo desta task).

### Task 12: Plano genérico da busca (2026-10-01)

- [x] `hybridSearchSql()` calcula o vetor uma vez (`WITH query_embedding AS (SELECT $2::vector AS v)`, sem `MATERIALIZED`, decisão tomada com base no EXPLAIN). Parâmetros, filtros, limiar, pesos e colunas iguais.
- [x] `hybrid-search.pg.spec.ts` (em `test:pg`):
  - equivalência legado × atual em 8 cenários (ids, `text_score`, `semantic_score`, `embeddingState`, `search_activated_at` e saída do `rankSearch`);
  - 10 execuções na mesma conexão, com `generic_plans > 0`;
  - no plano genérico, o cast acontece uma vez (`loops=1`).
  - Falhou contra o SQL antigo e passa depois.
- [x] `bench-plan-cache.ts` em 100k: antes 197–2.106 ms (média 1.149), depois 196–235 ms (média 209); 3.087 = 3.087 linhas, 0 divergências.

### Task 13: Decisão da arquitetura da busca (2026-10-01)

- [x] Decisão de produto: resultado completo e exato, sem paginação. `SEARCH ARCHITECTURE = ARCHITECTURE LIMITATION — FULL RESULT SET`. Ver `2026-09-29-catalogo-search-architecture.md` §10.
- [x] Desempate determinístico: `getSearch` ordena os candidatos por `id` antes de `rankSearch` (sort estável). `rankSearch` não mudou. Teste vermelho antes e verde depois.

### Task 14: Auditoria final (2026-10-01)

- [x] Revisão do código:
  - CTE `query_embedding` com o vetor referenciado só por `(SELECT v FROM query_embedding)`;
  - filtros de tenant (`$3`), `PUBLISHED`, idade (`$4`), pesos (`$5`/`$6`) e limiar (`$7`) iguais;
  - o SQL não tem `ORDER BY` por desenho (a ordem é do `rankSearch`), então o sort por id não esconde ordenação SQL errada;
  - contrato HTTP igual.
- [x] HTTP da busca (`search.spec.ts`, 8 testes):
  - limiar e pago;
  - empate de pagos e orgânicos;
  - empate em id crescente para 4 permutações da entrada;
  - faceta de nicho (`{kind:'niche'}` com listas vazias);
  - sem elegíveis (estrutura vazia);
  - adulto só com `age=yes`;
  - host sem tenant: 404.
  - O 503 sem provedor está coberto pelo Playwright (`busca mostra erro controlado`).
- [x] Spec PG da busca isolado: 2/2. Execuções 1 a 10 na mesma conexão: 77, 20, 18, 17, 18, 19, 18, 18, 19, 18 ms, com `generic_plans=1`.
- [x] `bench-plan-cache.ts` em 10k (seed novo): antes 41–677 ms (média 326), depois 42–56 ms (média 45); 288 = 288 linhas, 0 divergências.
- [x] Validação em sequência, sem `npm test` e `test:pg` juntos:
  - backend: 206 testes, PG 32, typecheck, lint, build e audit sem vulnerabilidades;
  - frontend: 7 testes, typecheck, lint, build e audit sem vulnerabilidades;
  - Playwright 16/16. É a 7ª suíte completa seguida 16/16 desde a correção de harness da Task 11. Nenhum órfão nas portas 3000, 3333 e 4099.
- [x] Ambiente limpo (cópia da árvore sem `node_modules`, `.next`, `build` e `.git`), na mesma sequência do CI:
  - `npm ci` → `npx prisma generate` → typecheck, lint e testes do backend (206), typecheck e build do backend;
  - `npm ci`, typecheck, lint, testes (7) e build do frontend.
  - Sem `prisma generate`, o typecheck falha (64 erros, `PrismaClient` não exportado), porque o postinstall do Prisma é bloqueado por `allowScripts`. O CI já roda `npx prisma generate` (linha 31).
- [ ] Caminho real de sucesso da busca (HTTP → embedding → SQL → DTO) sem teste automatizado: `loadCandidates` desvia por `NODE_ENV=test`, e o adapter da OpenAI não aceita base URL. As partes estão provadas separadamente (SQL no PG, `rankSearch`, rota em modo de teste). O conjunto depende da `OPENAI_API_KEY` ou de um ponto de injeção do embedding.
- [ ] Falha histórica do Playwright (Task 10): sem atribuição provada. Não se reproduziu em 7 suítes completas seguidas.
- Observações, sem alteração:
  - na faceta, os dois ramos do `if (matched?.requiresAge && age !== 'yes')` devolvem a mesma resposta, então o condicional é inócuo;
  - `resolveSearchTarget` recebe `networks = []`, então nome de rede não vira faceta. É o comportamento atual e coincide com a §2 da arquitetura ("consulta igual a nicho público vira redirecionamento").

Task 14, 2026-10-01: `PLAN = OPEN`. `LOCAL IMPLEMENTATION = NOT COMPLETE`. Não há bloqueio técnico reproduzível. Restam dois itens locais sem prova: a falha histórica do Playwright e o caminho real da busca sem teste automatizado. Ver a matriz abaixo.

### Task 15: Prova de ponta a ponta do caminho real da busca (2026-10-01)

- **Antes:** nenhum teste atravessava HTTP → embedding → SQL → PostgreSQL → `rankSearch` → resposta. `loadCandidates` desviava por `NODE_ENV=test`, e a rota criava a `OpenAiEmbeddingService` dentro do handler.
- [x] Composição, no padrão `set…ForTest` do projeto:
  - `@Search/routes.ts` depende de `SearchComposition { embedding, candidates }`;
  - `productionSearchComposition()` = `OpenAiEmbeddingService` (`env.OPENAI_API_KEY`, timeout 3 s) mais `sqlCandidateSource(prisma)`, que roda o mesmo `hybridSearchSql()`;
  - `loadCandidates` não tem mais `NODE_ENV`: sempre chama `embedding.embed(query)`, depois a fonte de candidatos, depois calcula a relevância.
  - Contrato HTTP, SQL e `rankSearch` inalterados.
- [x] `DeterministicTestEmbeddingService` (`src/test-support/deterministic-test-embedding.ts`):
  - 1536 dimensões, normalizado, mesma entrada gera o mesmo vetor (FNV-1a mais PRNG);
  - registra só os textos recebidos (`calls`).
  - Nenhum arquivo de produção o importa (verificado por teste), e nenhuma variável de ambiente ou request o seleciona.
- [x] `setConfigsRepositoryForTest` (mesmo padrão de tenants e links), para o spec ler `Config` do PostgreSQL.
- [x] `search-http.pg.spec.ts` (em `test:pg`), 4/4. Usa `app.inject` em `GET /api/v1/search`, tenant pelo host via Prisma, `Config`, nichos e links no PostgreSQL real, o `sqlCandidateSource(db)` de produção e o `rankSearch` real:
  - `embedding.calls = ['receitas de bolo']`, uma chamada por request;
  - patrocinados `['pago-1','pago-2']`, por `activatedAt` crescente; o pago abaixo do limiar fica fora;
  - orgânicos `['org-alta','org-media','tie-a','tie-b']`, com o empate saindo por id;
  - `relevanceScore = 0,4·text + 0,6·semantic` em todos os itens, e `surfaceToken` válido para o tenant;
  - ausentes: outro tenant, `DRAFT`, abaixo do limiar e adulto sem idade;
  - com `age=yes`, `adulto` empata com `org-alta` (vetor igual) e sai primeiro por id;
  - host B só vê o próprio link;
  - provedor que falha devolve 503 `provider_error` e o SQL não roda (`sqlCalls = 0`).
  - Achado: o PostgreSQL devolve `ts_rank = 1e-20`, e não 0, quando nenhum termo casa.
- [x] Proteção de produção (`search.spec.ts`, 12 testes):
  - a composição de produção é `OpenAiEmbeddingService`;
  - sem chave, rejeita sem chamar `fetch`;
  - a falha do provedor vira 503;
  - a busca chama o embedding uma vez e a faceta não chama;
  - o trecho da busca em `routes.ts` não contém `NODE_ENV`.
- [x] **Achado durante a task:** havia uma `OPENAI_API_KEY` disponível no processo de teste (carregada pelo `dotenv`; o conteúdo do `.env` não foi lido). O primeiro teste da composição de produção chegou a fazer uma request a `api.openai.com`, que falhou com `fetch failed`. Correção:
  - `vitest.config.ts` fixa `OPENAI_API_KEY: ''` (o `dotenv` não sobrescreve variável existente);
  - o teste passa a chave vazia explicitamente e intercepta o `fetch`.
  - O Playwright já fixava `OPENAI_API_KEY: ''` no `serve.mjs`.
- [x] Regressão em sequência:
  - backend: 210 testes, PG 36 (6 arquivos), typecheck, lint, build e audit sem vulnerabilidades;
  - frontend: 7 testes, typecheck, lint, build e audit sem vulnerabilidades;
  - Playwright 16/16, a 8ª suíte completa seguida desde a correção da Task 11, sem órfãos.
- [x] Ambiente limpo (cópia sem `node_modules`, `build` e `.git`): `npm ci` → `npx prisma generate` → typecheck, 210 testes, PG 36 e build.
- **Limitação:** a prova usa embedding determinístico. Não prova disponibilidade, latência nem qualidade da OpenAI, nem credenciais reais. Isso continua `BLOCKED_EXTERNAL`.
- Playwright histórico: reproduções atuais passam (8 suítes completas seguidas, sem retry, skip, timeout artificial ou órfãos). A causa exata da falha original não foi comprovada porque a trace foi perdida. Não bloqueia.

Task 15, 2026-10-01: `PLAN = OPEN` (itens externos e de produto). `LOCAL IMPLEMENTATION = COMPLETE`: o caminho real da busca está provado de ponta a ponta, todas as suítes locais passam (inclusive em ambiente limpo) e não restou bloqueio local. A limitação de escala da busca é decisão arquitetural documentada, não implementação incompleta.

## Status de implementação

Reconciliado em 2026-09-30 (Task 10).

| Item | Status | Evidência |
|---|---|---|
| Tasks 1-5 (Woovi RSA, analytics no PG, checkout no PG, contratos HTTP, frontend) | PASS | `woovi-webhook-signature.spec.ts`, `analytics.pg.spec.ts`, `checkout.pg.spec.ts`, Playwright |
| Task 6 Playwright | PASS com ressalva | Task 11: 2 defeitos de harness reproduzidos e corrigidos; 5/5 suítes 16/16 depois; falha histórica sem atribuição provada |
| Task 7 audit e observabilidade | PASS | `npm audit --audit-level=high`: 0 vulnerabilidades nos dois workspaces |
| Task 8 ambiente limpo | PASS (Task 14) | Cópia limpa: `npm ci` + `npx prisma generate` (igual ao CI) → typecheck, lint, testes e build verdes nos dois workspaces; audit sem vulnerabilidades |
| Task 9 fechamento com evidência | PASS | ver Task 9 |
| Task 10 preparação final | PASS nos itens marcados | ver Task 10 |
| OpenAI real (busca e moderação) | BLOCKED_EXTERNAL | Task 16: `backend/.env` (ignorado, nunca rastreado) define `OPENAI_API_KEY`, mas a chave não foi validada nem autorizada para uso nas provas; os testes a neutralizam (`OPENAI_API_KEY: ''` no vitest). Chave só exigida pelo provedor real; sem ela a busca responde 503 sem chamada externa e a moderação vai para ADMIN; timeout 3 s (busca) e 10 s (moderação/embedding); retries: `text-proposed` 3, `embed-link` 5; `sanitizeLog` corta `apiKey`/`authorization` |
| Stripe e Woovi | domínio PASS / contrato do adapter PASS / integração com provedor BLOCKED_EXTERNAL | `adapters.spec.ts`, `payments.spec.ts`, `checkout.pg.spec.ts`; sem `STRIPE_SECRET_KEY` nem `WOOVI_APP_ID` reais |
| E-mail/SMS | PROVIDER_SELECTION_REQUIRED | Portas e adapters prontos; nenhum provedor escolhido (a Contavera usa MailerSend/Mailgun, é referência e não decisão) |
| `BAN_AFTER_DELETION` | PRODUCT_DECISION_REQUIRED | Indefinido: (1) se conta banida pode se excluir; (2) se algo do banido sobrevive à exclusão (hoje a blocklist de telefone, e-mail e URL deriva da conta `BANNED` viva e some com a anonimização; guardar derivado contraria "sem hash de e-mail ou telefone"); (3) por quanto tempo. A exclusão também não tem rota |
| Busca híbrida em escala | ARCHITECTURE LIMITATION — FULL RESULT SET | Decisão de produto (Task 13): resultado completo e exato, sem paginação. Plano genérico corrigido (Task 12): ~210 ms em 100k em regime estável. Desempate por id aplicado. Custo linear, ~2 s projetados em 1M (não medido). Reabrir acima de ~100k links por tenant. Ver `2026-09-29-catalogo-search-architecture.md` §10 |
| CI remoto e E2E Linux | BLOCKED_EXTERNAL | `CI REMOTE EXECUTION REQUIRES PUSH/GITHUB`; `gh` ausente |

Matriz final da Task 14 (2026-10-01):

| Item | Status | Evidência |
|---|---|---|
| Busca: correção do plano genérico | PASS | `hybrid-search.pg.spec.ts`; benchmark 10k e 100k (Tasks 12 e 14) |
| Busca exata (mesmas linhas e scores) | PASS | Equivalência legado × atual: 8 cenários e benchmark com 0 divergências |
| Desempate determinístico | PASS | `search.spec.ts` (empate e 4 permutações) |
| Arquitetura de escala | ARCHITECTURE LIMITATION — FULL RESULT SET | Custo linear; ~209 ms em 100k; 500k e 1M não medidos; reabrir acima de ~100k links por tenant ou com p95 acima do orçamento |
| Paginação | NOT APPLICABLE | Decisão de produto da Task 13 |
| HNSW/KNN como fonte de candidatos | NOT USED BY DESIGN | Aproximado; não preserva o resultado completo |
| Autocomplete | OPEN — FUTURE / LOW RISK | ~21 ms, `ILIKE`, sem `pg_trgm` |
| Caminho real da busca ponta a ponta (composição) | PASS (Task 15) | `search-http.pg.spec.ts`: HTTP → embedding injetado → `hybridSearchSql` → PostgreSQL → `rankSearch` → JSON |
| Embedding real da OpenAI | BLOCKED_EXTERNAL | Sem `OPENAI_API_KEY` utilizável em teste; disponibilidade, latência e qualidade sem prova |
| Playwright | PASS | 16/16 em 8 suítes completas seguidas (Task 15), sem retry, skip, timeout artificial ou servidores órfãos |
| Falha histórica do Playwright (Task 10) | HISTORICAL FAILURE ROOT CAUSE = UNPROVEN | A trace foi perdida; os 2 defeitos de harness da Task 11 são candidatos, sem prova de atribuição. Não bloqueia |
| Backend | PASS | 210 testes (Task 15) |
| PostgreSQL | PASS | 36 testes, 6 arquivos (Task 15) |
| Frontend | PASS | 7 testes |
| Typecheck, lint e build (backend e frontend) | PASS | Workspace e cópia limpa |
| Audit (backend e frontend) | PASS | 0 vulnerabilidades |
| Ambiente limpo (`npm ci`) | PASS | Exige `npx prisma generate`, como o CI |
| CI remoto | BLOCKED_EXTERNAL | Sem push e sem `gh` |
| OpenAI, Stripe e Woovi reais | BLOCKED_EXTERNAL | Variáveis definidas no `.env` local (Task 16), sem validação nem autorização de uso; nenhuma integração real provada |
| E-mail/SMS | PROVIDER_SELECTION_REQUIRED | Nenhum provedor escolhido |
| `BAN_AFTER_DELETION` | PRODUCT_DECISION_REQUIRED | Ver acima |
| Isolamento do banco de testes | TECHNICAL DEBT — SHARED TEST DATABASE | `npm test` (specs `.redis`) e `test:pg` usam 5433/6380; o `TRUNCATE` de um apaga dados do outro em paralelo. O CI é sequencial |
| Composição de teste por `NODE_ENV` fora da busca | TECHNICAL DEBT | Repositórios, filas, gateways e autocomplete ainda escolhem dublês por `NODE_ENV`. Esses caminhos têm specs PG próprios (checkout, catálogo, analytics); a busca foi migrada para composição explícita na Task 15 |

`LOCAL IMPLEMENTATION = COMPLETE` (Task 15). `PLAN = OPEN` por itens `BLOCKED_EXTERNAL`, `PROVIDER_SELECTION_REQUIRED` e `PRODUCT_DECISION_REQUIRED`.

### Task 16 — auditoria pré-commit (2026-10-01)

- [x] Segredos: `backend/.env` e `frontend/.env` ignorados, nunca rastreados e ausentes do histórico. Nenhum valor do `.env` aparece no índice, no diff, nos arquivos novos nem nos logs de teste. Varredura sem chave OpenAI, Stripe live/test, `whsec_` ou JWT. As connection strings encontradas são credenciais locais de teste (`127.0.0.1`).
- [x] `woovi-test-signing.ts` (par RSA gerado para teste) só é importado por specs e pelo E2E. Produção verifica com `WOOVI_WEBHOOK_PUBLIC_KEY ?? WOOVI_PUBLISHED_PUBLIC_KEY`, e o spec prova que a assinatura de teste é rejeitada pela chave publicada.
- [x] OpenAI nos testes: `OPENAI_API_KEY: ''` no vitest e `fetch` mockado no teste de composição de produção. Nenhuma referência a `api.openai.com` nos logs. Única tentativa real conhecida: Task 15 (falhou com `fetch failed`).
- [x] Validação sequencial no workspace: backend 210, PG 36 (6 arquivos), typecheck, lint, build, audit 0; frontend 7, typecheck, lint, build, audit 0.
- [x] Ambiente limpo (cópia sem `node_modules`, `build`, `.git` e sem nenhum `.env`): `npm ci` → `npx prisma generate` → typecheck, lint, build, 210 testes, PG 36; frontend `npm ci` → 7 testes, typecheck, lint, build.
- **Ambiente local:** um `pnpm install` externo recriou `backend/pnpm-lock.yaml` (ignorado) e trocou o layout do `node_modules`, o que apagou o Prisma Client gerado. Foi corrigido com `npx prisma generate`. O CI usa `npm ci` e não é afetado.
- Playwright não foi reexecutado: esta task não alterou código de teste nem configuração.

Task 16, 2026-10-01: `PLAN = OPEN`. `LOCAL IMPLEMENTATION = COMPLETE`. CI remoto `BLOCKED_EXTERNAL` (sem push).

`PLAN = OPEN`.

Task 8, 2026-09-30: `PLAN = OPEN`. Audit reexecutado no mesmo dia: backend 2 high + 25 moderate, frontend 2 high + 3 moderate, zero critical. `OPENAI_API_KEY` ausente. `gh` não está instalado e não houve push, então o workflow não rodou. `BAN_AFTER_DELETION` continua `pending`. Access token continua em `sessionStorage`. Não houve downgrade do HyperDX nem instalação do Next 16.
