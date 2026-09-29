# Catálogo de links — desenho do v1

Data: 2026-09-29

Baseline: Contavera (`C:\VSCODE\Contavera\backend` e `C:\VSCODE\Contavera\frontend`).
Domínio: regras fechadas nesta conversa. Este arquivo não as reabre.

## 1. O que a Contavera é

Backend:

- Fastify 5, TypeScript 5.7, Prisma 6, PostgreSQL, Zod 3
- Pastas: `src/http/controllers/@Modulo`, `src/use-cases/@Modulo`, `src/repositories` + `src/repositories/prisma`, `src/env`, `src/jobs`
- Use case recebe repositório no construtor. Erro de domínio é classe. Controller valida com Zod e chama o use case.
- Auth: JWT 5 min + cookie `refreshToken`. Middleware `verifyJWT`.
- Env validado por Zod na subida. Health em `/api/v1/actuator/health`.
- Testes: Vitest. Unidade em `src/use-cases`. E2E em `src/http` com ambiente Prisma.
- Jobs atuais: `node-cron` dentro do processo. Não há Redis nem BullMQ.
- E-mail: MailerSend / Mailgun.
- Observabilidade presente: HyperDX/OpenTelemetry, incompleta no handler de 500.

Frontend:

- Next.js 15.3.8, React 19, Tailwind 4, Radix, react-hook-form, Zod, TanStack Query, axios
- App Router. Layouts por rota. UI em `src/components/ui` (button, card, dialog, table, form, toast, sidebar).
- Fontes: Geist e Plus Jakarta Sans.

O produto novo copia esse desenho. Não copia os módulos financeiros.

## 2. Desvios justificados

| Ponto | Contavera | Este produto | Motivo |
|---|---|---|---|
| Fila | node-cron | Redis + BullMQ | Moderação, embedding, expiração de Pix e estorno não podem viver no request |
| Busca | não existe | Postgres + pgvector, nota híbrida | Regra de relevância |
| Tenant | um produto | `tenant_id` resolvido pelo host | White label pedido |
| Categoria e plataforma | não se aplica | uma entidade só: Rede | A página pública trata as duas como a mesma coisa |
| Gateway e modelo de embedding | não existem | portas no domínio; Stripe, Woovi e OpenAI só nos adapters | Ver seção 12 |

## 3. Arquitetura

Monólito modular. Dois processos no mesmo código: API Fastify e worker BullMQ.

```text
Next (público, painel, admin)
        │  host + cookie
        ▼
Fastify /api/v1
        │
        ├─ use cases (regra)
        ├─ repositories Prisma
        └─ filas
                ▼
           worker BullMQ
                ├─ fetch de URL (SSRF bloqueado)
                ├─ IA de moderação
                ├─ embedding
                ├─ expiração de Pix
                └─ estorno
        ▼
PostgreSQL + pgvector
Redis (fila, lock, rate limit)
```

Tenant vem do host da request. O corpo do JSON não escolhe `tenant_id`.

## 4. Módulos

Auth, Users, Tenants, Links, Networks, Niches, Moderation, Search, Promotions, Orders, Payments, Refunds, Analytics, Admin, Notifications, Audit, Config.

Não existe módulo Category. Rede cobre o que o texto chama de categoria e de plataforma.

## 5. Domínio

Identidade:

- `Tenant`: host, nome, branding, moeda.
- `User`: tenant, nome, e-mail, telefone, senha, papel (`USER` ou `ADMIN`), status (`ACTIVE` ou `BANNED`).
- `UserIdentifier`: valor normalizado, tipo (`EMAIL` ou `PHONE`), atual ou histórico, confirmado em, deixou de ser atual em.
- `VerificationCode`: tipo, hash, expira, tentativas. Limite reaproveitado da Contavera: 5 tentativas, janela de 60 minutos.

Catálogo:

- `Network`: tenant, nome, slug, hosts conhecidos (`t.me`, `wa.me`, …).
- `Niche`: tenant, nome, slug, `requires_age`.
- `Link`: tenant, dono, URL canônica, nome, descrição, network, niche, status.
- Status do link: `DRAFT`, `PENDING_MODERATION`, `PRE_REJECTED`, `PUBLISHED`, `UNAVAILABLE`.
- Edição de nome ou descrição não cria outro link. A versão publicada continua até a nova passar.

Moderação:

- `ModerationCase`: link, origem (`AI`, `BLOCKLIST`, `PRE_REFUSAL`, `APPEAL`), JSON da IA, confiança, motivos, limiar usado, decisão do admin.
- Pré-recusa acontece antes da IA. Uma contestação por envio. IA não julga contestação nem bane.

Comercial:

- `PromotionProduct`: `SEARCH`, `NICHE`, `HOME`, `SEARCH_NICHE`, `SEARCH_NICHE_HOME`.
- `PromotionPrice`: produto, `duration_days`, preço em centavos, moeda, vigência.
- `Order`: usuário, link, produto, duração, preço gravado, status de pagamento.
- `Payment`: gateway id, valor, status.
- `PromotionGroup`: a compra. Pacote ou avulso.
- `Promotion`: uma superfície (`SEARCH`, `NICHE`, `HOME`), `activated_at`, `starts_at`, `expires_at`, status.
- Status do pedido: `PENDING_PAYMENT`, `PAID`, `EXPIRED`, `PAID_LATE`, `REFUND_PENDING`, `REFUNDED`, `REFUND_FAILED`.
- Status da promoção: `ACTIVE`, `EXPIRED`, `CANCELLED`.
- `activated_at` não muda na renovação. Só `expires_at` anda. Pedido novo guarda o preço daquela cobrança.

Busca e métrica:

- Embedding no link publicado.
- Nota = peso do texto + peso do vetor. Pesos e `SEARCH_RELEVANCE_THRESHOLD` ficam em `Config`.
- `AnalyticsEvent`: sessão, link, superfície, dia, tipo (`IMPRESSION` ou `CLICK`). Único nessa chave.
- Superfícies de métrica: `SEARCH`, `NICHE`, `HOME`, `ORGANIC`. Home de nicho e home de rede gravam `NICHE`.

Auditoria:

- `AuditLog`: ator, ação, entidade, antes, depois. Banimento, preço, limiar, `REFUND_FAILED` → `REFUNDED`.

## 6. Regras que o banco segura

- Preço do pedido é cópia. Mudar `PromotionPrice` não altera pedido antigo.
- Um link não tem duas promoções `ACTIVE` da mesma superfície. Índice único parcial.
- Pedido `PENDING_PAYMENT` da mesma superfície no mesmo link: índice único parcial. O segundo checkout falha na transação.
- URL banida é a URL canônica exata. Host de rede não entra nessa tabela.
- Identificador histórico não é apagado.
- `REFUND_FAILED` não tem transição para promoção `ACTIVE`.

## 7. Fluxos

Envio grátis: conta com e-mail e telefone confirmados, cota 4 (pendente + publicado), pré-recusa, lista fechada, senão fila de IA. Passe com confiança ≥ limiar publica. O resto vai ao admin. Envio não olha pagamento.

Edição: lista fechada ganha e a IA nem roda. Lista limpa e IA passa: texto entra. IA não passa: texto antigo fica.

Destaque: só link `PUBLISHED`, conta não banida. Backend calcula o preço. Pacote só se nenhuma superfície dele estiver ativa ou pendente. Pix 30 minutos. Cartão quando o webhook confirma. Webhook atrasado vira `PAID_LATE` e estorno, nunca promoção. Três tentativas idempotentes. Admin só marca `REFUNDED` quando o dinheiro voltou.

Busca: mesma nota para pago e orgânico. Abaixo do corte, fora. Patrocinado relevante sai do orgânico. Dentro do bloco, `activated_at` crescente. Orgânico por nota decrescente. Sem cauda de nicho.

Clique: página pública não conta. `Acessar` passa por `/go/:linkId`. Link indisponível não redireciona.

Banimento: links `UNAVAILABLE`, promoções `CANCELLED`, sem estorno automático, login em leitura, sem trocar e-mail ou telefone.

Idade: nicho `requires_age` fora da home e da busca até a sessão confirmar. Recusa também vale a sessão. API não devolve título nem URL antes disso. +18 não compra `HOME` nem `SEARCH_NICHE_HOME`.

## 8. Contratos que não mudam com o vendor

Checkout: `{ linkId, surfaces, durationDays }`. Resposta: produto resolvido, preço em centavos, `orderId`. Frontend não envia preço.

Veredito da IA: `{ pass, confidence, reasons }`.

Webhook: o adapter do gateway traduz para `{ gatewayEventId, orderId, status }`. O use case só conhece esse formato. `gatewayEventId` único.

## 9. Planos de implementação

O mapa é `docs/superpowers/plans/2026-09-29-catalogo.md`. Cada arquivo entrega software testável.

1. `docs/superpowers/plans/2026-09-29-catalogo-01-fundacao.md`
2. `docs/superpowers/plans/2026-09-29-catalogo-02-links.md`
3. `docs/superpowers/plans/2026-09-29-catalogo-03-admin.md`
4. `docs/superpowers/plans/2026-09-29-catalogo-04-busca.md`
5. `docs/superpowers/plans/2026-09-29-catalogo-05-pagamento.md`
6. `docs/superpowers/plans/2026-09-29-catalogo-06-vitrine-qualidade.md`

## 12. Provedores

O use case não importa SDK. Ele depende de `PaymentGateway` e `EmbeddingService`.

Pagamento:

- Cartão: `StripeCardPaymentGateway`.
- Pix: `WooviPixPaymentGateway` (API OpenPix).
- Cobrança Pix nasce com validade de 30 minutos. A expiração é um job BullMQ agendado para esse instante. Não há cron.
- Estorno Pix usa o mesmo `correlationID` em todas as tentativas, que é a chave de idempotência da Woovi. No máximo 3 tentativas, com novo job a cada falha.
- Webhook só muda estado depois que o adapter confirma o fato na API do provedor. Evento já processado não pede outro estorno e não ativa outra promoção.

Embedding:

- `OpenAiEmbeddingService`, modelo `text-embedding-3-large`, parâmetro `dimensions: 1536`.
- O texto reúne nome, descrição, nicho e rede.
- O job BullMQ grava o vetor no Postgres (`vector(1536)`). A request que publica o link não espera a OpenAI.
- A busca embute a consulta na hora, calcula `text_score` e `semantic_score`, soma com pesos de `Config` e corta em `SEARCH_RELEVANCE_THRESHOLD`.
- Trocar o modelo é trocar o adapter. O use case de busca não muda.

## 10. O que não será inventado

- Estorno automático no banimento.
- Superfície `CATEGORY`.
- Pacotes `SEARCH_HOME` e `NICHE_HOME`.
- Leilão, boleto, cauda de nicho, vetor puro.

## 11. Defaults herdados, não de domínio novo

- OTP: 5 tentativas, janela de 60 minutos, igual ao login da Contavera.
- Sessão de analytics e de idade: cookie de sessão do navegador, sem gravar na conta.
- Limiar inicial de moderação e pesos da busca: linhas em `Config`, editáveis no admin. O número inicial entra no seed e pode ser trocado sem deploy.
- Retenção: identificadores enquanto a conta existir; pedido e pagamento por 5 anos; analytics de sessão por 12 meses. Exclusão da conta anonimiza a pessoa. Pedido e auditoria ficam sem identificador pessoal, inclusive sem o uuid da conta. Sem outros prazos. Sem job de limpeza neste plano. Mapa: `docs/superpowers/specs/2026-09-29-lgpd.md`.
