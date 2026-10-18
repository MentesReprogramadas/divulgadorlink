# Plano de implementação F18 Busca dentro do perfil

**Gate de prioridade:** [F42](../specs/f42-evolution-moderacao.md) deve ser concluída antes desta feature, por prioridade definida em 15 de outubro de 2026. Este gate de sequência não cria dependência funcional de WhatsApp para o produto. Ordem de entrega atual: 17.

**Estado:** S0–S6 validadas localmente; S7 EM REVISÃO por CI/liberação remotos pendentes. [Execução F18](../execucao-f18.md).
**Spec vinculante:** [F18](../specs/f18-busca-perfil.md).
**Dependências:** G00, [F09](../specs/f09-perfil-publico.md), [F14](../specs/f14-agendamento.md).
**Onda:** 3. Etapas rastreadas no [roadmap](../roadmap-auditavel.md) e na [matriz](../matriz-aceitacao.csv).

## Resultado e fronteira de implementação

facilitar a navegação em páginas com muitos links.

Contrato a entregar: GET /api/v1/profiles/:slug/items?q&categoryId&cursor; parâmetros espelhados na URL da página.

Dados: Consulta limitada à projeção pública de ProfileItem, por nome/categoria, com ordem e paginação estáveis. Sem embeddings no MVP.

S0–S6 reconciliadas com a implementação e evidências da execução F18. Tarefas condicionais de migration/jobs/adapters não se aplicam: somente leitura de modelos existentes, sem novo índice/schema/fila/provedor. Não acionar implantação automática via push na main: o projeto publica a main pelo Coolify.

## Arquivos e pontos de integração

### Existentes a conferir e reaproveitar

- `frontend/src/components/domain/search-box.tsx`.
- `frontend/src/components/domain/facet-filters.tsx`.
- `backend/src/http/catalog-query.ts`.
- `frontend/src/styles/tokens.css` e componentes locais para manter aparência/comportamento.
- `frontend/playwright.config.ts`, harness E2E e CI: registrar testes novos.
- `backend/prisma/schema.prisma`, migrations e registro de testes PG, somente se o delta da feature exigir.

### Arquivos efetivos e responsabilidade

- backend/src/domain/profiles/profile-item-search.ts: regra lexical/página sobre projeção já autorizada.
- backend/src/lib/profile-item-search-page.ts: cursor e envelope, não transporte.
- backend/src/use-cases/@Profiles/search-profile-items.ts: compor repositories/projeção existentes; rotas @Profiles apenas validam e chamam casos de uso.
- frontend/src/features/profiles/profile-explorer.tsx: estado/transporte/concorrência; profile-search-contract.ts e profile-search-api.ts separam DTO/infra.
- components/profile-search-controls.tsx e profile-search.module.css: apresentação composta das primitivas; slots opcionais em ProfileView preservam renderer.
- use-profile-boundary.ts: timer compartilhado com ProfileLive; server/load-profile-items.ts e app/p/[slug]/page.tsx compõem SSR, sem dados privados.
- profile-preview-screen.tsx/skeleton: mesma busca na prévia existente, banner e at preservados. profile-schedule-fixture.ts compartilha fixture F14 sem mudar a regra.
- Manifesto SHA256 com todos os caminhos/testes/registro: output/roadmap-f18/source-manifest.json. Consultados SearchBox/FacetFilters/catalog-query não foram alterados.

## F18-S0 Escopo contratos e revisão de reutilização

**Entrada:** dependências concluídas, spec revisada e autorização de implementação.
**Saída auditável:** ADR/contrato revisado, ACs sem ambiguidade bloqueante, lista final de arquivos e fixtures.

- [x] Confrontar fonte e todos os ACs F18-AC01, F18-AC02, F18-AC03, F18-AC04; registrar mudanças de escopo sem apagar obrigações.
- [x] Fechar: D20 resolvida na execução: mínimo 1, máximo 100, 20 resultados/página e reinício de cursor informado.
- [x] Ler os pontos existentes acima; registrar o que será estendido e por que qualquer componente/porta/modelo novo é necessário.
- [x] Definir campos/tipos/validações reais de entrada `q,categoryId,cursor` e saída `projeção pública + search: filters/groups/total/nextCursor`; alinhar status/erros à aplicação.
- [x] Desenhar a jornada Buscar e filtrar categorias no perfil; limpar filtros e exibir estado vazio útil.
- [x] Definir fixture F18, permissões, relógio e adapters externos necessários. Não depender de serviços de produção.
- [x] Registrar rollout e como a versão anterior continuará funcionando durante alteração de dados.

## F18-S1 Testes unitários e componentes antes da regra

**Entrada:** contratos e decisões S0 fechados.
**Saída auditável:** testes que falham pelo comportamento ausente, não por erro de configuração.

- [x] Implementar em `backend/src/domain/profiles/profile-item-search.spec.ts` cada cenário U da spec: Busca normalizada não retorna ocultos, agendados fora da janela ou dados do draft; categoria inexistente não abre consulta global.
- [x] Confirmar falha esperada de cada comportamento ausente; guardar comando/saída/commit sem alterar regra para obter verde artificial.
- [x] Em `frontend/src/features/profiles/profile-explorer.test.tsx`, criar C01/C02 com interação real, estados vazio/erro/loading e fixture sentinela; não fazer snapshot espelhando implementação.
- [x] Se extrair lógica compartilhada, adicionar regressão do consumidor anterior antes de movê-la.
- [x] Preparar casos Tnn na camada correta e adicionar títulos com IDs; casos ainda não implementados ficam pendentes na matriz.

**Comando local, diretório backend:** `npx vitest run src/domain/profiles/profile-item-search.spec.ts`.
**Comando local, diretório frontend:** `npx vitest run src/features/profiles/profile-explorer.test.tsx`.

## F18-S2 Dados invariantes e migração

**Entrada:** S1 com falhas esperadas e esquema revisado.
**Saída auditável:** persistência/DTO corretos, migration revisada se necessária e plano de recuperação.

- [x] Implementar ou estender os contratos de repository e dados: Consulta limitada à projeção pública de ProfileItem, por nome/categoria, com ordem e paginação estáveis. Sem embeddings no MVP.
- [x] Definir índices de acesso, unicidade e FKs do tenant; usar transação para publicação/mutação composta; validar no PostgreSQL real. Não substituir a prova por repository em memória.
- [x] Preservar campos e contratos antigos durante rollout; documentar backfill, validação, volume, erro e retomada quando aplicáveis.
- [x] Testar migration em banco descartável com dados anteriores, conferir query plan nas consultas novas e registrar estratégia expand/contract. Não apagar conteúdo em downgrade.
- [x] Registrar cache/invalidação, política de exclusão/retenção e impacto sobre dados pessoais.
- [x] Comprovar unidade de tenant e regras específicas da spec: Não reutilizar busca global sem impor escopo profileId e elegibilidade pública.

## F18-S3 Regra de negócio API e jobs

**Entrada:** persistência/contratos S2 prontos.
**Saída auditável:** caso de uso integrado, API compatível e regra U verde.

- [x] Implementar o menor caso de uso que entregue GET /api/v1/profiles/:slug/items?q&categoryId&cursor; parâmetros espelhados na URL da página.
- [x] Executar regras U da spec até passarem, preservando regressões dos módulos reaproveitados.
- [x] Validar entrada com Zod e usar erros atuais; autenticar/autorizar por ação e recurso; não aceitar tenantId do body como autoridade.
- [x] Implementar consistência/idempotência e versionamento apenas onde a operação exigir; leitura pura não deve gerar mutação acidental.
- [x] Se houver job: usar BullMQ/worker existente, intenção durável, retry limitado e revalidação antes do efeito; definir consequência de crash entre persistir e entregar.
- [x] Se houver integração externa: adapter com porta e fake local; proteger rede/segredos; não acoplar provedor ao controller.
- [x] Conferir que nenhum dado privado/draft aparece na projeção pública, resposta de erro, log ou cache.

## F18-S4 Interface composição e estados

**Entrada:** API S3 disponível em ambiente local de desenvolvimento.
**Saída auditável:** jornada completa com componentes locais e testes C passando.

- [x] Implementar Buscar e filtrar categorias no perfil; limpar filtros e exibir estado vazio útil.
- [x] Compor Button/Field/Input/Select e estrutura de painel existentes; novo componente somente pela responsabilidade descrita em S0.
- [x] Conectar BFF/API reais, preservar host/cookies/CSRF; bloquear envio duplicado e mostrar resultado apenas depois de persistir.
- [x] Implementar loading, vazio, inválido, sem permissão, conflito e erro recuperável; preservar entrada válida na recuperação.
- [x] Usar renderer e projeção comum para prévia/público quando aplicável; ocultar ações sem capacidade sem confiar nisso para autorização.
- [x] Conferir teclado, foco, labels, contraste e mobile; não introduzir fonte/token/biblioteca nova sem motivo.
- [x] Rodar C01/C02 e regressão do componente compartilhado alterado; guardar capturas de referência.

## F18-S5 Integração contrato persistência e falhas

**Entrada:** S2–S4 concluídos.
**Saída auditável:** casos I/PG/worker e Tnn executados com asserções de estado final.

- [x] Implementar I01: Consulta só sobre versão publicada do perfil; combinação de filtros e cursor não repete itens; host B não encontra itens A.
- [x] Implementar I02 com outro dono A, tenant B e sem sessão; verificar negação e ausência de efeitos. Público permitido continua acessível.
- [x] Implementar I03: repetição, falha transacional/provedor e estado final consistente; controlar concorrência onde o contrato depende dela.
- [x] Criar um teste identificável por cada Tnn da matriz e verificar a obrigação exata do AC; não dar todos os critérios como cobertos por I01 sem assertivas.
- [x] Criar/estender `backend/src/http/profile-item-search.pg.spec.ts`, registrar na suíte PG/CI e comprovar constraints, consultas e concorrência com dados reais.
- [x] Se houver fila, provar reentrega/crash/revalidação usando Redis/worker do harness, sem esperar minutos reais.
- [x] Conferir dados sensíveis, sanitização, ordem, cache e métricas específicos da spec.

**Integração HTTP:** executada na suíte PG abaixo, com Fastify real; não existe uma suíte HTTP fictícia separada.
**PG local, backend:** com PG_SPECS=1 e URLs descartáveis configuradas, `npx vitest run --no-file-parallelism src/http/profile-item-search.pg.spec.ts`; registrar também na suíte completa.

## F18-S6 E2E Playwright e revisão visual

**Entrada:** I/PG/worker verdes e harness G00 operacional.
**Saída auditável:** jornada E real em desktop/mobile, trace/relatório e revisão dos casos manuais aplicáveis.

- [x] Registrar `frontend/e2e/profile-search.spec.ts` em features e features-mobile; comprovar descoberta com `npx playwright test --list`. Projetos existentes foram usados; a descoberta efetiva consta da execução.
- [x] Implementar E01 sem mockar API interna: Pesquisar nome, filtrar categoria, limpar; navegar por teclado; atualizar página mantém consulta; nome de item oculto não aparece nem no payload.
- [x] Implementar E02: isolamento de contextos, acesso direto, ausência no DOM e payload dos dados proibidos.
- [x] Implementar E03: mobile 390×844, teclado e falha/recuperação apropriada; confirmar persistência após reload.
- [x] Usar locators semânticos e assertions com auto-retry; polling para worker, sem waitForTimeout arbitrário.
- [x] Validar desktop 1280×720 e overflow 320px; revisar evidência visual e casos de download/QR/TLS/PWA quando aplicáveis.
- [x] Guardar relatório e trace de falha; teste skip ou não descoberto bloqueia gate. Se faltar plataforma real, registrar pendência manual, não chamar concluído.

**Comando local, frontend:** `npx playwright test e2e/profile-search.spec.ts --project=features`.
**Mobile local:** mesmo arquivo com `--project=features-mobile`.

## F18-S7 Regressão rollout e fechamento auditável

**Entrada:** todos os ACs aprovados, decisões resolvidas, evidências S0–S6 e autorização de liberação quando necessária.
**Saída auditável:** entrega revisada e comprovada, com plano de reversão e acompanhamento.

- [ ] Executar lint/typecheck/unit/build dos pacotes afetados e regressões descritas em qualidade; se compartilhado afeta catálogo/pagamentos/sessão/SEO, executar suas suítes.
- [ ] Confirmar E2E e testes PG no CI real, não só local; salvar commit/run/contagens e conferir ausência de skip indevido.
- [ ] Registrar observabilidade e indicador da fonte, sem novos payloads pessoais; risco a monitorar: Não reutilizar busca global sem impor escopo profileId e elegibilidade pública.
- [ ] Preparar rollout gradual pelo mecanismo de configuração aprovado; se flag nova, implementar parser/default/testes, sem presumir ConfigKey já pronto.
- [ ] Ensaiar reversão em ambiente descartável: desabilitar entrada nova, manter leituras compatíveis, preservar dados e usar migração compensatória revisada se necessário; nunca resetar banco para desfazer.
- [ ] Obter liberação concreta de deploy/cobrança/provisionamento somente quando a atividade futura pedir e conforme autorização vigente. Não publicar por este plano.
- [ ] Preencher roadmap S0–S7 e matriz com responsável, commit, comando, exit code e evidência. Sem evidência, manter etapa pendente.
- [ ] Atualizar decisões e documentação conforme implementação real sem inventar que hipótese virou regra.

## Check de saída da feature

- [x] F18-AC01, F18-AC02, F18-AC03, F18-AC04 aprovados, com testes Tnn rastreados.
- [x] U/C/I/E e PG/Redis/manual exigidos aprovados localmente; limites de plataforma registrados.
- [x] Reuso e design revistos; nenhuma duplicação sem justificativa.
- [x] Contratos, dados, migração, retenção, rollback e segurança revisados.
- [ ] Roadmap e evidências completos; aceitação final registrada.

**Registro vigente:** Codex; implementação local sem commit/push/deploy. Evidências e limites em [execução F18](../execucao-f18.md); S7/CI/liberação permanecem separados. Não iniciar F27 após esta entrega, por pedido do usuário.


## Resultado local reconciliado

S0–S6 e AC01–AC04 comprovados na execução: 511 U backend, 305 U frontend, 239 PG, 129 E2E e seis finais sobrepostos; 20 capturas inspecionadas. Itens condicionais de migration/index/backfill/job/provedor são N/A, não alegação de código ou operação executados. I03 é repetição sem efeitos de leitura; falha de rede/retry comprovada no navegador. Consulta pública usa publicação vigente, nunca o draft; prévia própria tem contexto/at autenticados. APIs anteriores preservadas e exercitadas; reversão aditiva documentada, sem reset de banco. S7 remoto e aceite de liberação continuam pendentes. Parada após F18 solicitada e cumprida.
