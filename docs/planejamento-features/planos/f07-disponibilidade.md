# Plano de implementação F07 Acompanhamento de disponibilidade

**Gate de prioridade:** [F42](../specs/f42-evolution-moderacao.md) deve ser concluída antes desta feature, por prioridade definida em 15 de outubro de 2026. Este gate de sequência não cria dependência funcional de WhatsApp para o produto. Ordem de entrega atual: 4.

**Estado:** CONCLUÍDO NA BRANCH; S0–S7 e CI aprovados.
**Spec vinculante:** [F07](../specs/f07-disponibilidade.md).
**Dependências:** G00, base existente.
**Onda:** 1. Etapas rastreadas no [roadmap](../roadmap-auditavel.md) e na [matriz](../matriz-aceitacao.csv).

## Resultado e fronteira de implementação

reduzir links expirados no catálogo e facilitar sua recuperação pelo proprietário.

Contrato a entregar: GET /api/v1/links/:id/availability; POST /api/v1/links/:id/url-proposals; job periódico particionado por host.

Dados: LinkAvailability, AvailabilityHost, UrlRevision e PromotionPause com invariantes descritos na spec e na execução. Recuperação transacional específica, sem reabrir genericamente o linkMachine.

Execução autorizada pelo usuário e realizada em codex/roadmap-features. Itens abaixo reconciliados com os arquivos efetivos; evidências no registro de execução. Não acionar implantação automática via push na main: o projeto publica a main pelo Coolify.

## Arquivos e pontos de integração

### Existentes a conferir e reaproveitar

- `backend/src/domain/links/url-availability.ts`.
- `backend/src/adapters/http/safe-fetch.ts`.
- `backend/src/domain/state/transition.ts`.
- `backend/src/worker.ts`.
- `backend/src/use-cases/@Links/submit-link.ts`.
- `frontend/src/styles/tokens.css` e componentes locais para manter aparência/comportamento.
- `frontend/playwright.config.ts`, harness E2E e CI: registrar testes novos.
- `backend/prisma/schema.prisma`, migrations e registro de testes PG, somente se o delta da feature exigir.

### Caminhos efetivos e justificativa

- `backend/src/use-cases/@Links/link-availability.ts e monitor-availability.ts`.
- `backend/src/http/controllers/@Links/routes.ts (ampliar existente se módulo já possuir registro)`.
- `backend/src/repositories/link-availability-repository.ts`.
- `frontend/src/features/availability (containers, componentes e CSS Modules)`.

Esses nomes não são obrigação de criar arquivos vazios. Preferir ampliação do módulo atual quando mesma responsabilidade existir. Testes: U `backend/src/domain/links/availability-monitor.spec.ts`; C `frontend/src/features/availability/components/url-correction-form.test.tsx`; I `backend/src/http/link-availability.pg.spec.ts`; PG `backend/src/http/link-availability.pg.spec.ts`; E `frontend/e2e/link-availability.spec.ts`.

## F07-S0 Escopo contratos e revisão de reutilização

**Entrada:** dependências concluídas, spec revisada e autorização de implementação.
**Saída auditável:** ADR/contrato revisado, ACs sem ambiguidade bloqueante, lista final de arquivos e fixtures.

- [x] Confrontar fonte e todos os ACs F07-AC01, F07-AC02, F07-AC03, F07-AC04, F07-AC05; registrar mudanças de escopo sem apagar obrigações.
- [x] Fechar: D08 limiar/intervalo/backoff, transição de recuperação e compensação de promoção paga durante indisponibilidade.
- [x] Ler os pontos existentes acima; registrar o que será estendido e por que qualquer componente/porta/modelo novo é necessário.
- [x] Definir campos/tipos/validações reais de entrada `canonicalUrl candidata,expectedVersion` e saída `availability{checkedAt,state,consecutiveFailures},proposal{id,status}; nunca publicar proposta prematuramente`; alinhar status/erros à aplicação.
- [x] Desenhar a jornada Dono vê última checagem; propõe convite substituto; versão aprovada só muda após validação; indisponível recupera pelo fluxo definido.
- [x] Definir fixture F07, permissões, relógio e adapters externos necessários. Não depender de serviços de produção.
- [x] Registrar rollout e como a versão anterior continuará funcionando durante alteração de dados.

## F07-S1 Testes unitários e componentes antes da regra

**Entrada:** contratos e decisões S0 fechados.
**Saída auditável:** testes que falham pelo comportamento ausente, não por erro de configuração.

- [x] Implementar em `backend/src/domain/links/availability-monitor.spec.ts` cada cenário U da spec: HTTP 403/429 não vira morto; uma falha transitória não despublica; endereço privado, redirecionamento interno ou DNS privado são bloqueados; resposta acessível não confirma vaga.
- [x] Confirmar falha esperada de cada comportamento ausente; guardar comando/saída/commit sem alterar regra para obter verde artificial.
- [x] Em `frontend/src/features/availability/components/url-correction-form.test.tsx`, criar C01/C02 com interação real, estados vazio/erro/loading e fixture sentinela; não fazer snapshot espelhando implementação.
- [x] Se extrair lógica compartilhada, adicionar regressão do consumidor anterior antes de movê-la.
- [x] Preparar casos Tnn na camada correta e adicionar títulos com IDs; casos ainda não implementados ficam pendentes na matriz.

**Comando executado, diretório backend:** `npx vitest run src/domain/links/disponibilidade.spec.ts`.
**Comando executado, diretório frontend:** `npx vitest run src/components/domain/disponibilidade.test.tsx`.

## F07-S2 Dados invariantes e migração

**Entrada:** S1 com falhas esperadas e esquema revisado.
**Saída auditável:** persistência/DTO corretos, migration revisada se necessária e plano de recuperação.

- [x] Implementar ou estender os contratos de repository e dados: LinkAvailability, AvailabilityHost, UrlRevision e PromotionPause com invariantes descritos na spec e na execução. Recuperação transacional específica, sem reabrir genericamente o linkMachine.
- [x] Definir índices de acesso, unicidade e FKs do tenant; usar transação para publicação/mutação composta; validar no PostgreSQL real. Não substituir a prova por repository em memória.
- [x] Preservar campos e contratos antigos durante rollout; documentar backfill, validação, volume, erro e retomada quando aplicáveis.
- [x] Testar migration em banco descartável com dados anteriores, conferir query plan nas consultas novas e registrar estratégia expand/contract. Não apagar conteúdo em downgrade.
- [x] Registrar cache/invalidação, política de exclusão/retenção e impacto sobre dados pessoais.
- [x] Comprovar unidade de tenant e regras específicas da spec: Não reabrir estado UNAVAILABLE sem definir invariantes e testar regressão de pagamentos/moderação.

## F07-S3 Regra de negócio API e jobs

**Entrada:** persistência/contratos S2 prontos.
**Saída auditável:** caso de uso integrado, API compatível e regra U verde.

- [x] Implementar o menor caso de uso que entregue GET /api/v1/links/:id/availability; POST /api/v1/links/:id/url-proposals; job periódico particionado por host.
- [x] Executar regras U da spec até passarem, preservando regressões dos módulos reaproveitados.
- [x] Validar entrada com Zod e usar erros atuais; autenticar/autorizar por ação e recurso; não aceitar tenantId do body como autoridade.
- [x] Implementar consistência/idempotência e versionamento apenas onde a operação exigir; leitura pura não deve gerar mutação acidental.
- [x] Se houver job: usar BullMQ/worker existente, intenção durável, retry limitado e revalidação antes do efeito; definir consequência de crash entre persistir e entregar.
- [x] Se houver integração externa: adapter com porta e fake local; proteger rede/segredos; não acoplar provedor ao controller.
- [x] Conferir que nenhum dado privado/draft aparece na projeção pública, resposta de erro, log ou cache.

## F07-S4 Interface composição e estados

**Entrada:** API S3 disponível em ambiente local de desenvolvimento.
**Saída auditável:** jornada completa com componentes locais e testes C passando.

- [x] Implementar Dono vê última checagem; propõe convite substituto; versão aprovada só muda após validação; indisponível recupera pelo fluxo definido.
- [x] Compor Button/Field/Input/Select e estrutura de painel existentes; novo componente somente pela responsabilidade descrita em S0.
- [x] Conectar BFF/API reais, preservar host/cookies/CSRF; bloquear envio duplicado e mostrar resultado apenas depois de persistir.
- [x] Implementar loading, vazio, inválido, sem permissão, conflito e erro recuperável; preservar entrada válida na recuperação.
- [x] Usar renderer e projeção comum para prévia/público quando aplicável; ocultar ações sem capacidade sem confiar nisso para autorização.
- [x] Conferir teclado, foco, labels, contraste e mobile; não introduzir fonte/token/biblioteca nova sem motivo.
- [x] Rodar C01/C02 e regressão do componente compartilhado alterado; guardar capturas de referência.

## F07-S5 Integração contrato persistência e falhas

**Entrada:** S2–S4 concluídos.
**Saída auditável:** casos I/PG/worker e Tnn executados com asserções de estado final.

- [x] Implementar I01: Dois probes concorrentes não sobrescrevem revisão nova; job revalida URL antes de aplicar resultado; substituição invalida comprovação e preserva histórico de promoção.
- [x] Implementar I02 com outro dono A, tenant B e sem sessão; verificar negação e ausência de efeitos. Público permitido continua acessível.
- [x] Implementar I03: repetição, falha transacional/provedor e estado final consistente; controlar concorrência onde o contrato depende dela.
- [x] Criar um teste identificável por cada Tnn da matriz e verificar a obrigação exata do AC; não dar todos os critérios como cobertos por I01 sem assertivas.
- [x] Criar/estender `backend/src/http/link-availability.pg.spec.ts`, registrar na suíte PG/CI e comprovar constraints, consultas e concorrência com dados reais.
- [x] Se houver fila, provar reentrega/crash/revalidação usando Redis/worker do harness, sem esperar minutos reais.
- [x] Conferir dados sensíveis, sanitização, ordem, cache e métricas específicos da spec.

**Comando executado no backend:** `npx vitest run src/http/disponibilidade.http.spec.ts`.
**PG executado, backend:** com PG_SPECS=1 e URLs descartáveis configuradas, `npx vitest run --no-file-parallelism src/http/disponibilidade.pg.spec.ts`; registrar também na suíte completa.

## F07-S6 E2E Playwright e revisão visual

**Entrada:** I/PG/worker verdes e harness G00 operacional.
**Saída auditável:** jornada E real em desktop/mobile, trace/relatório e revisão dos casos manuais aplicáveis.

- [x] Registrar `frontend/e2e/link-availability.spec.ts` em features e features-mobile; comprovar descoberta com `npx playwright test --list`. Projetos registrados no runner existente.
- [x] Implementar E01 sem mockar API interna: Simular timeout por adapter local, conferir link ainda ativo; repetir limiar aprovado; corrigir URL e completar validação; conferir recuperação no público.
- [x] Implementar E02: isolamento de contextos, acesso direto, ausência no DOM e payload dos dados proibidos.
- [x] Implementar E03: mobile 390×844, teclado e falha/recuperação apropriada; confirmar persistência após reload.
- [x] Usar locators semânticos e assertions com auto-retry; polling para worker, sem waitForTimeout arbitrário.
- [x] Validar desktop 1280×720 e overflow 320px; revisar evidência visual e casos de download/QR/TLS/PWA quando aplicáveis.
- [x] Guardar relatório e trace de falha; teste skip ou não descoberto bloqueia gate. Se faltar plataforma real, registrar pendência manual, não chamar concluído.

**Comando executado, frontend:** `npx playwright test e2e/link-availability.spec.ts --project=features`.
**Mobile executado:** mesmo arquivo com `--project=features-mobile`.

## F07-S7 Regressão rollout e fechamento auditável

**Entrada:** todos os ACs aprovados, decisões resolvidas, evidências S0–S6 e autorização de liberação quando necessária.
**Saída auditável:** entrega revisada e comprovada, com plano de reversão e acompanhamento.

- [x] Executar lint/typecheck/unit/build dos pacotes afetados e regressões descritas em qualidade; se compartilhado afeta catálogo/pagamentos/sessão/SEO, executar suas suítes.
- [x] Confirmar E2E e testes PG no CI real, não só local; salvar commit/run/contagens e conferir ausência de skip indevido.
- [x] Registrar observabilidade e indicador da fonte, sem novos payloads pessoais; risco a monitorar: Não reabrir estado UNAVAILABLE sem definir invariantes e testar regressão de pagamentos/moderação.
- [x] Preparar rollout gradual pelo mecanismo de configuração aprovado; se flag nova, implementar parser/default/testes, sem presumir ConfigKey já pronto.
- [x] Ensaiar reversão em ambiente descartável: desabilitar entrada nova, manter leituras compatíveis, preservar dados e usar migração compensatória revisada se necessário; nunca resetar banco para desfazer.
- [x] Obter liberação concreta de deploy/cobrança/provisionamento somente quando a atividade futura pedir e conforme autorização vigente. Não publicar por este plano.
- [x] Preencher roadmap S0–S7 e matriz com responsável, commit, comando, exit code e evidência. Sem evidência, manter etapa pendente.
- [x] Atualizar decisões e documentação conforme implementação real sem inventar que hipótese virou regra.

## Check de saída da feature

- [x] F07-AC01, F07-AC02, F07-AC03, F07-AC04, F07-AC05 aprovados, com testes Tnn rastreados.
- [x] U/C/I/E e PG/Redis/manual exigidos aprovados.
- [x] Reuso e design revistos; nenhuma duplicação sem justificativa.
- [x] Contratos, dados, migração, retenção, rollback e segurança revisados.
- [x] Roadmap e evidências completos; aceitação final registrada.

**Registro de execução:** Codex; branch codex/roadmap-features. [Execução e evidências](../execucao-f07.md). Deploy não realizado. O usuário pediu encerrar após esta feature; F02 não iniciada.


## Ajustes de implementação e reuso

A fila administrativa e seus endpoints são concretos, separados de F42. O monitor usa fila BullMQ dedicada no worker existente; a persistência nova concentra concessão, versão, throttle e journal, responsabilidades ausentes na base. Reutilizados safe-fetch, mailer/templates, autorização, auditoria, quota e controles locais. O guard puro assertCheckout foi extraído para domain/promotions/eligibility.ts e reexportado pelo módulo anterior, preservando seus consumidores. Revalidação da configuração de rede/categoria é protegida por locks no momento da aprovação. Comprovação de URL F28 permanece fora do escopo, conforme reconciliação da spec.

Aceite final: commit `9b64caffc540e310297ff38df1ff9ce4eda8fc40`, CI 38840376754. Obter liberação de deploy é N/A nesta entrega: nenhuma implantação foi solicitada/executada. Detalhes e limites no registro de execução. A obrigação de comprovação de propriedade de URL depende de F28, como reconciliado na spec; não há prova existente na base a invalidar.
