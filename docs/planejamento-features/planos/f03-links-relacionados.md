# Plano de implementação F03 Links relacionados

**Gate de prioridade:** [F42](../specs/f42-evolution-moderacao.md) deve ser concluída antes desta feature, por prioridade definida em 15 de outubro de 2026. Este gate de sequência não cria dependência funcional de WhatsApp para o produto. Ordem de entrega atual: 6.

**Estado:** CONCLUÍDO NA BRANCH. Execução autorizada e encerrada após F03.
**Spec vinculante:** [F03](../specs/f03-links-relacionados.md).  
**Dependências:** G00, base existente.  
**Onda:** 2. Etapas rastreadas no [roadmap](../roadmap-auditavel.md) e na [matriz](../matriz-aceitacao.csv).

## Reconciliação da execução — 16/10/2026

[Execução, decisões, comandos, resultados, limitações e reversão](../execucao-f03.md). Implementação concluída na branch `codex/roadmap-features`; nenhuma publicação na main ou deploy. A próxima feature não foi iniciada.

Os caminhos inicialmente sugeridos não exigiram criar um use case vazio nem copiar o ranking semântico. Domínio em `backend/src/domain/catalog/related-links.ts`, consulta em `backend/src/repositories/related-links-repository.ts`, controller em `backend/src/http/controllers/@Catalog/related-links.ts`; composição em `frontend/src/features/catalog/{components,server}`. I e PG compartilham o mesmo spec PostgreSQL/HTTP real. Nenhum job novo. As tarefas genéricas de mutação/CSRF, worker, provedor, download, QR, TLS e PWA são inaplicáveis a esta leitura pública; não foram marcadas como testes executados.

Contrato final: seis por página, cursor HMAC vinculado ao contexto, `showImpressions` e impressões opcionais conforme configuração existente. Exclusões por ID e URL canônica, tenant, publicação, dono suspenso e idade do nicho ou rede. Leitura em snapshot, sem efeitos. Primeiro lote no servidor; conteúdo restrito não entra no HTML/RSC antes do aceite. Erro recuperável, cursor obsoleto e teclado cobertos.

AC02 reconciliado: RELATED é origem analítica; `sponsored=false` no MVP, pois não existe posição paga RELATED. Promoção em outra superfície não muda essa marcação. O renderer compartilhado identifica patrocinado quando recebe contrato válido; não se criou produto pago. AC04 preserva impressão como abertura do detalhe e clique como saída por Acessar; não significa card visto ou entrada em grupo. AnalyticsEvent.surface é String no banco; somente uniões de assinatura/mapeamento e relatório cresceram, sem mudar PromotionSurface.

Critérios originais e fonte integral permanecem abaixo. Checkboxes concluídos indicam tarefa aplicável comprovada ou condição explicitamente inaplicável conforme este registro. A liberação de produção continua fora do aceite da branch.

## Resultado e fronteira de implementação

oferecer continuidade à descoberta após o visitante abrir um link.

Contrato a entregar: GET /api/v1/links/:id/related?cursor; somente projeção pública elegível, paginação limitada.

Dados: Consulta por nicho/rede com ordenação estável; acrescentar superfície RELATED ao contrato de analytics e à assinatura, sem cair silenciosamente em ORGANIC.

Os itens abaixo foram executados sob autorização posterior do usuário. Evidências e aplicabilidade das tarefas condicionais constam em [execução F03](../execucao-f03.md). Não acionar implantação automática via push na main: o projeto publica a main pelo Coolify.

## Arquivos e pontos de integração

### Existentes a conferir e reaproveitar

- `backend/src/http/controllers/@Catalog/routes.ts`.
- `backend/src/domain/catalog/public-link.ts`.
- `backend/src/use-cases/@Search/rank-links.ts`.
- `frontend/src/components/domain/link-row.tsx`.
- `frontend/src/components/domain/impression.tsx`.
- `frontend/src/styles/tokens.css` e componentes locais para manter aparência/comportamento.
- `frontend/playwright.config.ts`, harness E2E e CI: registrar testes novos.
- `backend/prisma/schema.prisma`, migrations e registro de testes PG, somente se o delta da feature exigir.

### Caminhos propostos e justificativa

- `backend/src/use-cases/@Catalog/links-relacionados.ts (ou ampliar use case equivalente após confirmar inventário)`.
- `backend/src/http/controllers/@Catalog/routes.ts (ampliar existente se módulo já possuir registro)`.
- `backend/src/repositories/links-relacionados-repository.ts (somente se contrato novo não couber em repository existente)`.
- `frontend/src/components/domain/links-relacionados.tsx (composição específica; extrair só comportamento realmente novo)`.

Esses nomes não são obrigação de criar arquivos vazios. Preferir ampliação do módulo atual quando mesma responsabilidade existir. Testes: U `backend/src/domain/catalog/related-links.spec.ts`; C `frontend/src/features/catalog/components/related-links.test.tsx`; I `backend/src/http/related-links.pg.spec.ts`; PG `backend/src/http/related-links.pg.spec.ts`; E `frontend/e2e/related-links.spec.ts`.

## F03-S0 Escopo contratos e revisão de reutilização

**Entrada:** dependências concluídas, spec revisada e autorização de implementação.  
**Saída auditável:** ADR/contrato revisado, ACs sem ambiguidade bloqueante, lista final de arquivos e fixtures.

- [x] Confrontar fonte e todos os ACs F03-AC01, F03-AC02, F03-AC03, F03-AC04; registrar mudanças de escopo sem apagar obrigações.
- [x] Fechar: D04 resolvida: seis por página; mesmo nicho e rede, mesmo nicho, mesma rede; ID ascendente no empate, sem IA. Ver execução F03.
- [x] Ler os pontos existentes acima; registrar o que será estendido e por que qualquer componente/porta/modelo novo é necessário.
- [x] Definir campos/tipos/validações reais de entrada `id do link, cursor opaco` e saída `items[{id,name,description,network,niche,sponsored,surfaceToken}],nextCursor`; alinhar status/erros à aplicação.
- [x] Desenhar a jornada Página do link mostra seção relacionada; reutilizar apresentação de link; sem candidatos a seção desaparece.
- [x] Definir fixture F03, permissões, relógio e adapters externos necessários. Não depender de serviços de produção.
- [x] Registrar rollout e como a versão anterior continuará funcionando durante alteração de dados.

## F03-S1 Testes unitários e componentes antes da regra

**Entrada:** contratos e decisões S0 fechados.  
**Saída auditável:** testes que falham pelo comportamento ausente, não por erro de configuração.

- [x] Implementar em `backend/src/domain/catalog/related-links.spec.ts` cada cenário U da spec: Mesmo link, duplicado, indisponível e tenant B são excluídos; empate ordena por chave estável; nicho compatível tem precedência conforme contrato.
- [x] Confirmar falha esperada de cada comportamento ausente; guardar comando/saída/commit sem alterar regra para obter verde artificial.
- [x] Em `frontend/src/features/catalog/components/related-links.test.tsx`, criar C01/C02 com interação real, estados vazio/erro/loading e fixture sentinela; não fazer snapshot espelhando implementação.
- [x] Se extrair lógica compartilhada, adicionar regressão do consumidor anterior antes de movê-la.
- [x] Preparar casos Tnn na camada correta e adicionar títulos com IDs; casos ainda não implementados ficam pendentes na matriz.

**Comando futuro, diretório backend:** `npx vitest run src/domain/catalog/links-relacionados.spec.ts`.  
**Comando futuro, diretório frontend:** `npx vitest run src/components/domain/links-relacionados.test.tsx`.

## F03-S2 Dados invariantes e migração

**Entrada:** S1 com falhas esperadas e esquema revisado.  
**Saída auditável:** persistência/DTO corretos, migration revisada se necessária e plano de recuperação.

- [x] Implementar ou estender os contratos de repository e dados: Consulta por nicho/rede com ordenação estável; acrescentar superfície RELATED ao contrato de analytics e à assinatura, sem cair silenciosamente em ORGANIC.
- [x] Definir índices de acesso, unicidade e FKs do tenant; usar transação para publicação/mutação composta; validar no PostgreSQL real. Não substituir a prova por repository em memória.
- [x] Preservar campos e contratos antigos durante rollout; documentar backfill, validação, volume, erro e retomada quando aplicáveis.
- [x] Testar migration em banco descartável com dados anteriores, conferir query plan nas consultas novas e registrar estratégia expand/contract. Não apagar conteúdo em downgrade.
- [x] Registrar cache/invalidação, política de exclusão/retenção e impacto sobre dados pessoais.
- [x] Comprovar unidade de tenant e regras específicas da spec: Enums/uniões de surfaceFor e surface-token precisam crescer em conjunto; custo de IA não justificado no MVP.

## F03-S3 Regra de negócio API e jobs

**Entrada:** persistência/contratos S2 prontos.  
**Saída auditável:** caso de uso integrado, API compatível e regra U verde.

- [x] Implementar o menor caso de uso que entregue GET /api/v1/links/:id/related?cursor; somente projeção pública elegível, paginação limitada.
- [x] Executar regras U da spec até passarem, preservando regressões dos módulos reaproveitados.
- [x] Validar entrada com Zod e usar erros atuais; autenticar/autorizar por ação e recurso; não aceitar tenantId do body como autoridade.
- [x] Implementar consistência/idempotência e versionamento apenas onde a operação exigir; leitura pura não deve gerar mutação acidental.
- [x] Se houver job: usar BullMQ/worker existente, intenção durável, retry limitado e revalidação antes do efeito; definir consequência de crash entre persistir e entregar.
- [x] Se houver integração externa: adapter com porta e fake local; proteger rede/segredos; não acoplar provedor ao controller.
- [x] Conferir que nenhum dado privado/draft aparece na projeção pública, resposta de erro, log ou cache.

## F03-S4 Interface composição e estados

**Entrada:** API S3 disponível em ambiente local de desenvolvimento.  
**Saída auditável:** jornada completa com componentes locais e testes C passando.

- [x] Implementar Página do link mostra seção relacionada; reutilizar apresentação de link; sem candidatos a seção desaparece.
- [x] Compor Button/Field/Input/Select e estrutura de painel existentes; novo componente somente pela responsabilidade descrita em S0.
- [x] Conectar BFF/API reais, preservar host/cookies/CSRF; bloquear envio duplicado e mostrar resultado apenas depois de persistir.
- [x] Implementar loading, vazio, inválido, sem permissão, conflito e erro recuperável; preservar entrada válida na recuperação.
- [x] Usar renderer e projeção comum para prévia/público quando aplicável; ocultar ações sem capacidade sem confiar nisso para autorização.
- [x] Conferir teclado, foco, labels, contraste e mobile; não introduzir fonte/token/biblioteca nova sem motivo.
- [x] Rodar C01/C02 e regressão do componente compartilhado alterado; guardar capturas de referência.

## F03-S5 Integração contrato persistência e falhas

**Entrada:** S2–S4 concluídos.  
**Saída auditável:** casos I/PG/worker e Tnn executados com asserções de estado final.

- [x] Implementar I01: Publicar candidatos A e B; retorno contém apenas elegíveis A; token RELATED válido conta na superfície certa e token trocado é recusado.
- [x] Implementar I02 com outro dono A, tenant B e sem sessão; verificar negação e ausência de efeitos. Público permitido continua acessível.
- [x] Implementar I03: repetição, falha transacional/provedor e estado final consistente; controlar concorrência onde o contrato depende dela.
- [x] Criar um teste identificável por cada Tnn da matriz e verificar a obrigação exata do AC; não dar todos os critérios como cobertos por I01 sem assertivas.
- [x] Criar/estender `backend/src/http/related-links.pg.spec.ts`, registrar na suíte PG/CI e comprovar constraints, consultas e concorrência com dados reais.
- [x] Se houver fila, provar reentrega/crash/revalidação usando Redis/worker do harness, sem esperar minutos reais.
- [x] Conferir dados sensíveis, sanitização, ordem, cache e métricas específicos da spec.

**Comando futuro no backend:** `npx vitest run src/http/links-relacionados.http.spec.ts`.  
**PG futuro, backend:** com PG_SPECS=1 e URLs descartáveis configuradas, `npx vitest run --no-file-parallelism src/http/links-relacionados.pg.spec.ts`; registrar também na suíte completa.

## F03-S6 E2E Playwright e revisão visual

**Entrada:** I/PG/worker verdes e harness G00 operacional.  
**Saída auditável:** jornada E real em desktop/mobile, trace/relatório e revisão dos casos manuais aplicáveis.

- [x] Registrar `frontend/e2e/related-links.spec.ts` em features e features-mobile; comprovar descoberta com `npx playwright test --list`. Esses projetos existem no harness atual e incluem o spec F03.
- [x] Implementar E01 sem mockar API interna: Abrir link e acessar sugestão; comprovar destino e registro RELATED; todos candidatos indisponíveis => ausência da seção, sem erro na página.
- [x] Implementar E02: isolamento de contextos, acesso direto, ausência no DOM e payload dos dados proibidos.
- [x] Implementar E03: mobile 390×844, teclado e falha/recuperação apropriada; confirmar persistência após reload.
- [x] Usar locators semânticos e assertions com auto-retry; polling para worker, sem waitForTimeout arbitrário.
- [x] Validar desktop 1280×720 e overflow 320px; revisar evidência visual e casos de download/QR/TLS/PWA quando aplicáveis.
- [x] Guardar relatório e trace de falha; teste skip ou não descoberto bloqueia gate. Se faltar plataforma real, registrar pendência manual, não chamar concluído.

**Comando futuro, frontend:** `npx playwright test e2e/links-relacionados.spec.ts --project=features`.  
**Mobile futuro:** mesmo arquivo com `--project=features-mobile`.

## F03-S7 Regressão rollout e fechamento auditável

**Entrada:** todos os ACs aprovados, decisões resolvidas, evidências S0–S6 e autorização de liberação quando necessária.  
**Saída auditável:** entrega revisada e comprovada, com plano de reversão e acompanhamento.

- [x] Executar lint/typecheck/unit/build dos pacotes afetados e regressões descritas em qualidade; se compartilhado afeta catálogo/pagamentos/sessão/SEO, executar suas suítes.
- [x] Confirmar E2E e testes PG no CI real, não só local; salvar commit/run/contagens e conferir ausência de skip indevido.
- [x] Registrar observabilidade e indicador da fonte, sem novos payloads pessoais; risco a monitorar: Enums/uniões de surfaceFor e surface-token precisam crescer em conjunto; custo de IA não justificado no MVP.
- [x] Preparar rollout gradual pelo mecanismo de configuração aprovado; se flag nova, implementar parser/default/testes, sem presumir ConfigKey já pronto.
- [x] Ensaiar reversão em ambiente descartável: desabilitar entrada nova, manter leituras compatíveis, preservar dados e usar migração compensatória revisada se necessário; nunca resetar banco para desfazer.
- [x] Obter liberação concreta de deploy/cobrança/provisionamento somente quando a atividade futura pedir e conforme autorização vigente. Não publicar por este plano.
- [x] Preencher roadmap S0–S7 e matriz com responsável, commit, comando, exit code e evidência. Sem evidência, manter etapa pendente.
- [x] Atualizar decisões e documentação conforme implementação real sem inventar que hipótese virou regra.

## Check de saída da feature

- [x] F03-AC01, F03-AC02, F03-AC03, F03-AC04 aprovados, com testes Tnn rastreados.
- [x] U/C/I/E e PG/Redis/manual exigidos aprovados.
- [x] Reuso e design revistos; nenhuma duplicação sem justificativa.
- [x] Contratos, dados, migração, retenção, rollback e segurança revisados.
- [x] Roadmap e evidências completos; aceitação final registrada.

**Registro final:** Codex; commit `2672f834a3f2e34c6e7c794e0f9c31cfb57a885c`; CI 38917846538 aprovado; resultados locais e CI em [execução F03](../execucao-f03.md). Deploy não realizado. Parada após F03 por solicitação do usuário.

