# Compra de destaque na própria página — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox syntax for tracking. Sem commits: o usuário autorizou implementação e subagentes, mas não commit, push ou deploy.

**Goal:** Oferecer e pagar destaque no próprio pós-cadastro, com complemento reversível e recuperação coerente no header/painel e na saída da escolha manual.

**Architecture:** Extrair a jornada atual de destaque para `features/promotions/promotion-purchase.tsx`, reutilizada pela rota de destaque e pelo resultado de cadastro. O servidor continua proprietário de elegibilidade, campanhas, preços, idempotência e confirmação. Banner/contador e recuperação são componentes compartilhados; a oferta de saída é a mesma compra, apresentada em dialog antes da navegação.

**Tech Stack:** Next 15, React 19, CSS Modules, Fastify, Prisma, PostgreSQL/Redis, Stripe já instalado, Vitest/Playwright. Sem nova biblioteca.

**Spec:** `docs/superpowers/specs/2026-11-04-destaque-compra-na-pagina.md` (aprovada pelo usuário em 04/11).

## Global Constraints

- Trabalhar na worktree/branch existente `codex/destaque-pos-cadastro`; preservar todas as mudanças anteriores.
- Desconto 20% uma vez, prazo absoluto 24h, cooldown 30 dias, cotação do servidor.
- +18 nunca compra Home/Completo, incluindo checkout, renovação, retomada e replay.
- Preservar tenant, autorização, canSubmit, suspensão, verificação, semântica de publicidade, consentimento e pagamento confirmado no servidor.
- Oferta inicial substitui formulário/stepper sem modal; nenhum segundo modal ao dispensá-la.
- Comprar/Pix/Cartão permanecem na mesma superfície. Campos e autenticação de cartão não podem ser pulados pela meta de dois cliques.
- Desconto verde; escassez em banner âmbar abaixo do header. Contador 160ms somente dígitos alterados e reduced motion.

## Review Focus

1. Oferta expira durante seleção/pagamento: não comprar cotação vencida nem gerar desconto cumulativo.
2. Campanha ativa de outro link/cooldown: não anunciar promoção inexistente.
3. Home adicionada via complemento pode ser removida; Completo escolhido diretamente não oferece complemento.
4. Saída por link interno/Voltar: uma intervenção, saída sempre disponível e ausência de loop/retenção abusiva.
5. Pedido pendente impede trocar valores/superfícies; retomada não cria cobrança duplicada.

## Task 1 — Emissão de campanha de saída e recuperação persistente (backend)

**Owner:** subagente backend. Arquivos: `backend/src/use-cases/@Promotions/launch-offer.ts`, `backend/src/http/controllers/@Promotions/offers.ts`, domínio/testes correspondentes e Prisma/migração somente se necessário para seleção persistida.

**Interfaces:** POST `/v1/promotions/launch-offer` aceita `{linkId, source?:'post_create'|'exit', productCode?:OfferCode, durationDays?:7|14|28}`. Padrão mantém pós-cadastro recente. `exit` admite link antigo elegível e valida seleção; campanha existente para mesmo link é reutilizada, sem novo preço/prazo/desconto. DTO opcional `productCode`, `durationDays` preserva recuperação. GET recuperação retorna campanha ainda ativa mesmo quando `dismissed=true`, para o painel poder mantê-la; DELETE oculta somente fora do painel. Catálogo vinculado ao link continua proprietário de preços e restrição de idade.

- [x] Escrever e observar testes falharem para fonte exit em link antigo, 20% não cumulativo, cooldown/outro link, seleção +18 inválida e GET após dispensa.
- [x] Implementar mínimo necessário com transação/lock existentes, checks de elegibilidade e persistência de seleção.
- [x] Rodar testes afetados; lint/typecheck/build backend. Informar arquivos/contrato/testes para integração.

## Task 2 — Compra reutilizável e saída contextual (frontend)

**Owner:** subagente compra. Criar `frontend/src/features/promotions/promotion-purchase.tsx`; transformar `app/painel/links/[id]/destaque/page.tsx` em composição; evoluir `promotion-upgrade.tsx` e `promotion-checkout.module.css`; adaptar/criar testes de compra e upgrade.

**Produces:** `PromotionPurchase({linkId:string, mode?:'post-create'|'manual', onLeave?:()=>void})`. Sem AreaFrame dentro do componente. A rota manual mantém parâmetros de renovação/plan/request existentes. Pós-cadastro emite a campanha e inicia Busca+Nicho/7d; a rota manual lê catálogo sem emitir desconto até intenção de saída. Usar `OfferDeadlineBanner({expiresAt,onExpire?})` e `OfferCountdown({expiresAt,compact?})` de Task 3.

- [x] Observar testes falharem para integração plan/method, reversão Home, ausência de complemento no Completo direto, desconto expirado, saída sem loop e retomada financeira.
- [x] Extrair estados/transporte de compra existentes preservando Stripe/Pix/webhooks e renovação. Pix selecionado; CTA Comprar cria/retoma o pedido. Cartão expande campos na mesma página, mantém pagamentos/3DS necessários; não criar checkout intermediário.
- [x] Manter base da seleção separada do complemento: selecionar aplica oferta superior do catálogo; desmarcar/remove restaura base; trocar plano limpa origem do complemento.
- [x] Na seleção manual, preparar oferta via POST source exit somente ao tentar navegar. Interceptar links internos e Voltar sem beforeunload personalizado; respeitar Ctrl/Cmd/target/download/hash. Excluir checkout ativo, compra, oferta inicial e renovação. Dialog curto: cotação, prazo, método, Comprar e Sair sem destacar. Uma apresentação por sessão/campanha; CTA compra executa ali mesmo, sem nova rota.
- [x] Rodar testes afetados e entregar interface para Task 4.

## Task 3 — Banner, recuperação, card de link e criação de página

**Owner:** subagente superfícies. Arquivos: `features/promotions/components/launch-offer-reminder.tsx`, `launch-offer.module.css`, novos `offer-countdown.tsx` e CSS Module; `features/account/components/area-frame.tsx`; layout/header compartilhado se necessário; `components/domain/panel-links.tsx` e CSS local; `features/profiles/components/profile-creation-choice.tsx` e testes.

**Produces:** `OfferCountdown({expiresAt:string,compact?:boolean})`, `OfferDeadlineBanner({expiresAt:string,onExpire?:()=>void})` exportados de `features/promotions/components/offer-countdown.tsx`. Countdown sem anunciar todo segundo, tabular, animação local 160ms/reduced-motion. Reminder recupera DTO de Task 1 incluindo seleção opcional.

- [x] Observar testes falharem para recolher/expandir, ocultar fora mas persistir no painel, prazo/compra, ordem das ações e assistente primeiro.
- [x] Colocar lembrete imediatamente abaixo do header compartilhado em sessão elegível, sem afetar preview público/tenant/grants; fora do painel pode ocultar no expandido, painel não tem remover. Não duplicar banner em pós-cadastro/destaque.
- [x] Destacar acima das ações e abaixo das métricas; remover Mais opções; expor Ver resultado, Editar, Disponibilidade, Acessar respeitando gates.
- [x] Ordenar Criar com ajuda antes de Criar do meu jeito, mantendo grant e conteúdo.
- [x] Rodar testes afetados e entregar arquivos/contratos ao coordenador.

## Task 4 — Cadastro substitui conteúdo (coordenador)

**Files:** `app/painel/links/novo/page.tsx` e testes; remover uso de LaunchOfferPrompt/modal na conclusão bem-sucedida, preservando erro/rejeição/limites/storage warnings.

- [x] Teste falha: cadastro PUBLICADO ou PENDING com id renderiza compra na página sem dialog nem stepper; onLeave navega Meus links sem oferta de retenção.
- [x] Usar `PromotionPurchase linkId={result.id} mode="post-create"`; mover foco para título da oferta; scroll início; formulário/stepper deixam de existir nesse estado.
- [x] Conferir estados falha/rejeição e regressões do formulário existentes.

## Task 5 — Revisão e integração

- [x] Subagente revisor inspeciona tarefas 1–4 contra spec e qualidade, sem implementar nem commitar. Corrigir achados materiais com regressão e registrar decisões.
- [x] Consolidar tipos/DTOs, transições, recuperação e navegação. Não duplicar precificação ou elegibilidade.

## Task 6 — E2E, localhost e evidências

- [x] Atualizar `frontend/e2e/promotion-launch-offer.spec.ts` para pós-cadastro sem dialog, Home reversível, Comprar direto/Pix, confirmação assinada, recuperação global/painel, saída contextual/seleção, idade e expiração/cooldown.
- [x] Rodar em desktop 1440×900 e mobile 390×844; incluir 320px/zoom, teclado/foco e Axe no escopo alterado. Cartão simulado não prova 3DS real; declarar limite.
- [x] Lint, typecheck, testes afetados e build frontend/backend; registrar falhas de baseline sem atribuí-las ao patch.
- [x] Reiniciar somente harness próprio, manter localhost3200/API3533/containers dedicados; preservar dados e processos alheios. Capturas reais e determinísticas em `output/destaque-v2-implementacao`.
- [x] Atualizar grafo incremental code-only local, sem LLM/API/custo externo; registrar limites e relatório de validação. Mostrar capturas e instruções de teste ao usuário.

## Ledger

- Fechamento: tarefas concluídas; frontend 95 testes afetados, backend 37, E2E 12/12, lint/typecheck/build dos dois pacotes aprovados. Agent Browser percorreu UI real e gerou capturas desktop/mobile/Pix. Relatório: `docs/frontend-profissional/evidencias/destaque-compra-na-pagina-2026-11-04.md`. Localhost mantido; sem commit/push/deploy. Stripe/3DS real não testado.

- 04/11: spec e desenhos FigCraft aprovados; usuário autorizou plano, subagentes e implementação. Sem autorização de commit/push/deploy. Grafo consultado para pontos de entrada; estado anterior à v2, conclusões confirmadas nos arquivos.
