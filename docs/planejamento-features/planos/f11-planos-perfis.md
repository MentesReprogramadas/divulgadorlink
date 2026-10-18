# Plano de implementação F11 Planos para perfis e páginas

**Gate de prioridade:** [F42](../specs/f42-evolution-moderacao.md) deve ser concluída antes desta feature, por prioridade definida em 15 de outubro de 2026. Este gate de sequência não cria dependência funcional de WhatsApp para o produto. Ordem de entrega atual: 12.

**Estado:** VALIDADA LOCALMENTE; S0–S6 verificadas, S7 remoto/comercial EM REVISÃO.
**Spec vinculante:** [F11](../specs/f11-planos-perfis.md).  
**Dependências:** G00, [F09](../specs/f09-perfil-publico.md).  
**Onda:** 3. Etapas rastreadas no [roadmap](../roadmap-auditavel.md) e na [matriz](../matriz-aceitacao.csv).

## Reconciliação autorizada — 17/10/2026

A instrução mais recente delega a escolha fundamentada e exige registrar alternativas. [Execução F11](../execucao-f11.md) contém as decisões D12/D13, inventário e testes iniciais. A marca continua em todos os planos por pedido posterior explícito; o editor atual não recebe paywall retroativo. Recursos futuros não serão vendidos como disponíveis. Preços e prontidão vêm do servidor e de configuração real, com venda desabilitada por padrão; não há autorização de implantação implícita. A execução e os resultados efetivos estão registrados no documento vinculado; a liberação comercial permanece separada.

## Resultado e fronteira de implementação

Oferecer planos de perfil com capacidades comerciais verificáveis e ciclo recorrente próprio.

Contrato a entregar: GET /api/v1/profile-plans; POST /api/v1/subscriptions/checkout; GET /me/subscription; POST cancel/change; webhook autenticado de ciclo de vida.

Dados: Plan, PlanVersion, Subscription, Entitlement e BillingEvent deduplicado; manter Order/Promotion para exposição no catálogo. Catálogo de capacidades existe antes da página premium; não exige premium já implementado.

As checklists abaixo descrevem os gates originais e devem ser lidas com os resultados de execucao-f11.md e do ledger. A autorização posterior permitiu implementar; a mera existência do plano não autoriza outras operações. Não acionar implantação automática via push na main: o projeto publica a main pelo Coolify.

## Arquivos e pontos de integração

### Existentes a conferir e reaproveitar

- `backend/src/domain/payments/payment-gateway.ts`.
- `backend/src/adapters/payments/stripe-card-payment-gateway.ts`.
- `backend/src/http/controllers/@Payments/routes.ts`.
- `backend/src/domain/state/transition.ts`.
- `frontend/src/components/domain/order-grid.tsx`.
- `frontend/src/styles/tokens.css` e componentes locais para manter aparência/comportamento.
- `frontend/playwright.config.ts`, harness E2E e CI: registrar testes novos.
- `backend/prisma/schema.prisma`, migrations e registro de testes PG, somente se o delta da feature exigir.

### Caminhos propostos e justificativa

- `backend/src/use-cases/@Billing/planos-perfis.ts (ou ampliar use case equivalente após confirmar inventário)`.
- `backend/src/http/controllers/@Billing/routes.ts (ampliar existente se módulo já possuir registro)`.
- `backend/src/repositories/planos-perfis-repository.ts (somente se contrato novo não couber em repository existente)`.
- `frontend/src/components/domain/planos-perfis.tsx (composição específica; extrair só comportamento realmente novo)`.

Esses nomes não são obrigação de criar arquivos vazios. Preferir ampliação do módulo atual quando mesma responsabilidade existir. Testes: U `backend/src/domain/billing/profile-plans.spec.ts`; C `frontend/src/features/profile-billing/billing-screen.test.tsx`; I `backend/src/http/profile-billing-routes.pg.spec.ts`; PG `backend/src/http/profile-billing-processing.pg.spec.ts`; E `frontend/e2e/profile-billing.spec.ts`.

## F11-S0 Escopo contratos e revisão de reutilização

**Entrada:** dependências concluídas, spec revisada e autorização de implementação.  
**Saída auditável:** ADR/contrato revisado, ACs sem ambiguidade bloqueante, lista final de arquivos e fixtures.

- [x] Confrontar fonte e todos os ACs F11-AC01, F11-AC02, F11-AC03, F11-AC04; registrar mudanças de escopo sem apagar obrigações.
- [x] Fechar: D13 preços, limites, periodicidade, prorrata, provedor e tratamento tributário; D12 grace/cancelamento.
- [x] Ler os pontos existentes acima; registrar o que será estendido e por que qualquer componente/porta/modelo novo é necessário.
- [x] Definir campos/tipos/validações reais de entrada `planVersionId,returnPath interno; change{targetPlanVersionId,timing}` e saída `subscription{id,status,currentPeriodEnd,capabilities},checkoutUrl validada; preço calculado no servidor`; alinhar status/erros à aplicação.
- [x] Desenhar a jornada Comparar gratuito/Pro/Premium; concluir checkout; mostrar pendente até confirmação; gerenciar assinatura e efeitos da mudança.
- [x] Definir fixture F11, permissões, relógio e adapters externos necessários. Não depender de serviços de produção.
- [x] Registrar rollout e como a versão anterior continuará funcionando durante alteração de dados.

## F11-S1 Testes unitários e componentes antes da regra

**Entrada:** contratos e decisões S0 fechados.  
**Saída auditável:** testes que falham pelo comportamento ausente, não por erro de configuração.

- [x] Implementar em `backend/src/domain/billing/profile-plans.spec.ts` cada cenário U da spec: Estado ativo concede capacidade, pendente não; expiração remove capacidade conforme política; downgrade não apaga conteúdo; comparar centavos/moeda sem float.
- [x] Registrar RED/GREEN efetivo do domínio e testes de componentes na integração, sem fabricar RED retroativo; guardar comandos/saídas e asserções observáveis.
- [x] Em `frontend/src/features/profile-billing/billing-screen.test.tsx`, criar C01/C02 com interação real, estados vazio/erro/loading e fixture sentinela; não fazer snapshot espelhando implementação.
- [x] Se extrair lógica compartilhada, adicionar regressão do consumidor anterior antes de movê-la.
- [x] Preparar casos Tnn na camada correta e adicionar títulos com IDs; casos ainda não implementados ficam pendentes na matriz.

**Comando executado, backend:** `npx vitest run src/domain/billing/profile-plans.spec.ts`.
**Comando executado, frontend:** `npx vitest run src/features/profile-billing`.

## F11-S2 Dados invariantes e migração

**Entrada:** S1 com falhas esperadas e esquema revisado.  
**Saída auditável:** persistência/DTO corretos, migration revisada se necessária e plano de recuperação.

- [x] Implementar ou estender os contratos de repository e dados: Plan, PlanVersion, Subscription, Entitlement e BillingEvent deduplicado; manter Order/Promotion para exposição no catálogo. Catálogo de capacidades existe antes da página premium; não exige premium já implementado.
- [x] Definir índices de acesso, unicidade e FKs do tenant; usar transação para publicação/mutação composta; validar no PostgreSQL real. Não substituir a prova por repository em memória.
- [x] Preservar campos e contratos antigos durante rollout; documentar backfill, validação, volume, erro e retomada quando aplicáveis.
- [x] Testar migration em banco descartável com dados anteriores, conferir query plan nas consultas novas e registrar estratégia expand/contract. Não apagar conteúdo em downgrade.
- [x] Registrar cache/invalidação, política de exclusão/retenção e impacto sobre dados pessoais.
- [x] Comprovar unidade de tenant e regras específicas da spec: Não implementar recorrência com laço de PaymentIntents ou reaproveitar OrderStatus de promoção; Billing adapter separado justificado pelo ciclo recorrente.

## F11-S3 Regra de negócio API e jobs

**Entrada:** persistência/contratos S2 prontos.  
**Saída auditável:** caso de uso integrado, API compatível e regra U verde.

- [x] Implementar o menor caso de uso que entregue GET /api/v1/profile-plans; POST /api/v1/subscriptions/checkout; GET /me/subscription; POST cancel/change; webhook autenticado de ciclo de vida.
- [x] Executar regras U da spec até passarem, preservando regressões dos módulos reaproveitados.
- [x] Validar entrada com Zod e usar erros atuais; autenticar/autorizar por ação e recurso; não aceitar tenantId do body como autoridade.
- [x] Implementar consistência/idempotência e versionamento apenas onde a operação exigir; leitura pura não deve gerar mutação acidental.
- [x] Se houver job: usar BullMQ/worker existente, intenção durável, retry limitado e revalidação antes do efeito; definir consequência de crash entre persistir e entregar.
- [x] Se houver integração externa: adapter com porta e fake local; proteger rede/segredos; não acoplar provedor ao controller.
- [x] Conferir que nenhum dado privado/draft aparece na projeção pública, resposta de erro, log ou cache.

## F11-S4 Interface composição e estados

**Entrada:** API S3 disponível em ambiente local de desenvolvimento.  
**Saída auditável:** jornada completa com componentes locais e testes C passando.

- [x] Implementar Comparar gratuito/Pro/Premium; concluir checkout; mostrar pendente até confirmação; gerenciar assinatura e efeitos da mudança.
- [x] Compor Button/Field/Input/Select e estrutura de painel existentes; novo componente somente pela responsabilidade descrita em S0.
- [x] Conectar BFF/API reais, preservar host/cookies/CSRF; bloquear envio duplicado e mostrar resultado apenas depois de persistir.
- [x] Implementar loading, vazio, inválido, sem permissão, conflito e erro recuperável; preservar entrada válida na recuperação.
- [x] Usar renderer e projeção comum para prévia/público quando aplicável; ocultar ações sem capacidade sem confiar nisso para autorização.
- [x] Conferir teclado, foco, labels, contraste e mobile; não introduzir fonte/token/biblioteca nova sem motivo.
- [x] Rodar C01/C02 e regressão do componente compartilhado alterado; guardar capturas de referência.

## F11-S5 Integração contrato persistência e falhas

**Entrada:** S2–S4 concluídos.  
**Saída auditável:** casos I/PG/worker e Tnn executados com asserções de estado final.

- [x] Implementar I01: Webhook duplicado e fora de ordem não concede duas vezes; assinatura mapeada ao dono via IDs do provedor; sucesso de browser sozinho não ativa; promoção paga antiga segue intacta.
- [x] Implementar I02 com outro dono A, tenant B e sem sessão; verificar negação e ausência de efeitos. Público permitido continua acessível.
- [x] Implementar I03: repetição, falha transacional/provedor e estado final consistente; controlar concorrência onde o contrato depende dela.
- [x] Criar um teste identificável por cada Tnn da matriz e verificar a obrigação exata do AC; não dar todos os critérios como cobertos por I01 sem assertivas.
- [x] Criar/estender `backend/src/http/profile-billing-processing.pg.spec.ts`, registrar na suíte PG/CI e comprovar constraints, consultas e concorrência com dados reais.
- [x] Se houver fila, provar reentrega/crash/revalidação usando Redis/worker do harness, sem esperar minutos reais.
- [x] Conferir dados sensíveis, sanitização, ordem, cache e métricas específicos da spec.

**Comando executado no backend, com PG_SPECS=1 e banco descartável:** `npx vitest run src/http/profile-billing-routes.pg.spec.ts`.
**PG futuro, backend:** com PG_SPECS=1 e URLs descartáveis configuradas, `npx vitest run --no-file-parallelism src/http/profile-billing-processing.pg.spec.ts`; registrar também na suíte completa.

## F11-S6 E2E Playwright e revisão visual

**Entrada:** I/PG/worker verdes e harness G00 operacional.  
**Saída auditável:** jornada E real em desktop/mobile, trace/relatório e revisão dos casos manuais aplicáveis.

- [x] Registrar `frontend/e2e/profile-billing.spec.ts` em features e features-mobile; comprovar descoberta com `npx playwright test --list`. Projetos features/features-mobile atuais; configuração específica billing também disponível.
- [x] Implementar E01 sem mockar API interna: Criar assinatura em adapter sandbox; voltar ao painel pendente; confirmar evento assinado e ver capacidade; simular falha de renovação e cancelamento; verificar perfil básico preservado.
- [x] Implementar E02: isolamento de contextos, acesso direto, ausência no DOM e payload dos dados proibidos.
- [x] Implementar E03: mobile 390×844, teclado e falha/recuperação apropriada; confirmar persistência após reload.
- [x] Usar locators semânticos e assertions com auto-retry; polling para worker, sem waitForTimeout arbitrário.
- [x] Validar desktop 1280×720 e overflow 320px; revisar evidência visual e casos de download/QR/TLS/PWA quando aplicáveis.
- [x] Guardar relatório e trace de falha; teste skip ou não descoberto bloqueia gate. Se faltar plataforma real, registrar pendência manual, não chamar concluído.

**Comando executado, frontend:** `npx playwright test --config playwright.billing.config.ts`.
**Mobile futuro:** mesmo arquivo com `--project=features-mobile`.

## F11-S7 Regressão rollout e fechamento auditável

**Entrada:** todos os ACs aprovados, decisões resolvidas, evidências S0–S6 e autorização de liberação quando necessária.  
**Saída auditável:** entrega revisada e comprovada, com plano de reversão e acompanhamento.

- [ ] Executar lint/typecheck/unit/build dos pacotes afetados e regressões descritas em qualidade; se compartilhado afeta catálogo/pagamentos/sessão/SEO, executar suas suítes.
- [ ] Confirmar E2E e testes PG no CI real, não só local; salvar commit/run/contagens e conferir ausência de skip indevido.
- [ ] Registrar observabilidade e indicador da fonte, sem novos payloads pessoais; risco a monitorar: Não implementar recorrência com laço de PaymentIntents ou reaproveitar OrderStatus de promoção; Billing adapter separado justificado pelo ciclo recorrente.
- [ ] Preparar rollout gradual pelo mecanismo de configuração aprovado; se flag nova, implementar parser/default/testes, sem presumir ConfigKey já pronto.
- [ ] Ensaiar reversão em ambiente descartável: desabilitar entrada nova, manter leituras compatíveis, preservar dados e usar migração compensatória revisada se necessário; nunca resetar banco para desfazer.
- [ ] Obter liberação concreta de deploy/cobrança/provisionamento somente quando a atividade futura pedir e conforme autorização vigente. Não publicar por este plano.
- [ ] Preencher roadmap S0–S7 e matriz com responsável, commit, comando, exit code e evidência. Sem evidência, manter etapa pendente.
- [ ] Atualizar decisões e documentação conforme implementação real sem inventar que hipótese virou regra.

## Check de saída da feature

- [ ] F11-AC01, F11-AC02, F11-AC03, F11-AC04 aprovados, com testes Tnn rastreados.
- [ ] U/C/I/E e PG/Redis/manual exigidos aprovados.
- [ ] Reuso e design revistos; nenhuma duplicação sem justificativa.
- [ ] Contratos, dados, migração, retenção, rollback e segurança revisados.
- [ ] Roadmap e evidências completos; aceitação final registrada.

**Registro local:** Codex; sem commit; 490 unitários backend, 276 frontend na bateria conjunta, 212 PG, dez E2E específicos e 69 de regressão (sobreposição, não somar). Dezesseis capturas revisadas. S7 permanece em revisão, sem CI remoto ou liberação comercial. Ver comandos/limites em execucao-f11.md.

