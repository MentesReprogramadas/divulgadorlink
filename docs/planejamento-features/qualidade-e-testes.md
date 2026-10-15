# Qualidade e estratégia de testes

## Escopo e verdade sobre execução

Este arquivo especifica trabalho futuro. Os comandos abaixo não foram executados na elaboração do planejamento. Não há garantia de baseline verde. O gate G00 deve medi-lo em checkout e bancos descartáveis antes de implementar.

Vitest cobre domínio e componentes; integração exercita controllers reais, PostgreSQL e Redis; Playwright cobre jornadas reais Next → BFF → Fastify → banco/worker. E2E aqui significa navegador com a aplicação real. Teste de controller com app.inject é integração HTTP, não evidência suficiente do fluxo de interface.

## Baseline e lacunas verificadas

- `frontend/playwright.config.ts`: projetos setup e catalog, testMatch explícito, um worker, retries 0, trace retido em falha, screenshot só em falha. Arquivo novo fora da expressão NÃO roda.
- `frontend/e2e/global-setup.ts`: remove e recria contêineres de teste com nomes fixos, usa PostgreSQL/pgvector na porta 5433, Redis 6380 e portas 3000/3333/4099 livres; aplica migrações e seed. Não rodar contra banco real, não executar suítes concorrentes com esses mesmos recursos.
- `frontend/e2e/serve.mjs`: sobe API, worker, stub Woovi e build/start real do Next. Preservar isso; não substituí-lo por uma segunda estratégia de webServer sem necessidade demonstrada.
- `frontend/e2e/auth.setup.ts` e catalog.spec reutilizam estado de Bia; accessToken tem TTL curto e existe assertiva de validade. Suíte de 42 features deve renovar autenticação por fixture ou relogar no teste; não aumentar TTL de produção para mascarar falha.
- `frontend/vitest.config.ts`: src/**/*.test.ts(x), jsdom. `backend/vitest.config.ts`: node, exclui .pg.spec sem PG_SPECS.
- `backend/package.json`: test:pg lista seis caminhos explicitamente. Teste PG novo precisa ser registrado no comando/coleção correspondente e demonstrado como descoberto.
- `.github/workflows/ci.yml`: jobs verify/web/images/e2e existentes. E2E instala só Chromium e reporter é list; retenção de artefatos e outros navegadores ainda devem ser planejados e implementados em G00.
- Mudanças locais já presentes não são parte deste trabalho. Não atribuir falhas a uma feature nova sem comparação da baseline.

## G00 antes de ampliar a suíte

- [ ] Registrar commit, alterações locais e versões Node/npm/navegador.
- [ ] Rodar baseline atual em ambiente descartável e guardar comandos/exit codes/relatórios, sem chamar baseline quebrada de verde.
- [ ] Introduzir projetos de features em Playwright ou ampliar testMatch de forma controlada, preservando setup e catalog; evitar que auth.setup rode duas vezes acidentalmente.
- [ ] Confirmar descoberta com `npx playwright test --list`; cada arquivo/ID previsto tem de aparecer.
- [ ] Preparar dataset determinístico por feature e autenticação por contexto. A, outro dono A, tenant B, admin e colaborador quando aplicável.
- [ ] Registrar testes PG novos e validar que não são silenciosamente ignorados. Não depender apenas de npm test.
- [ ] Preparar reporter HTML + JSON/JUnit e upload de relatórios/trace/screenshot no CI, sem segredos, mantendo um run isolado com portas/contêineres atuais.
- [ ] Verificar capacidade de tempo controlado, stubs externos, inbox/outbox e promoção de job. Helpers de teste não podem ser expostos em produção.
- [ ] Criar matriz mobile Chromium; adicionar smoke WebKit/Firefox quando acordado em D43 e instalar browsers correspondentes no CI. Não declarar execução nesses browsers antes disso.
- [ ] Registrar plano de QA manual para câmera/QR, instalação PWA e TLS/DNS real.

## Camadas e exigências por feature

| Camada | Evidência obrigatória | O que não basta |
| --- | --- | --- |
| U domínio | Entrada, relógio/seed explícito, saída e invariantes por cenário da spec | Testar apenas que função foi chamada |
| C componente | Render real, interação, loading/erro/vazio, acessibilidade e não submissão duplicada | Snapshot sem comportamento |
| I HTTP | app.inject no controller real, Zod, auth/CSRF, resposta e estado persistido | Mockar o use case e chamar isso de integração |
| PG | Migração aplicada, constraints, concorrência, rollback transacional e consultas reais | In-memory repository como prova de unicidade |
| Redis/worker | Job real no harness, retry/dedup/revalidação e estado final | Chamar handler uma vez sem fila quando a propriedade depende de concorrência |
| E Playwright | Aplicação inteira, browser isolado, jornada positiva e negativa, persistência e resultado visível | page.route na API interna substituindo backend/banco |
| M manual | Checklist, plataforma, versão, arquivo/foto/evidência e responsável | Dizer que parece correto no código |

Regra: todos os 226 ACs possuem caso Tnn na matriz. A camada primária é ajustada pela semântica do critério, nunca para evitar testá-lo. Cada caso precisa de assertiva própria; compartilhar fixture e passos é permitido, dar o mesmo resultado genérico a todos não é. Critérios de UI devem ter caso E2E ou componente além de contrato. Critérios de persistência/concorrência devem ter teste PG/Redis. Limites de interpretação devem ser validados no texto/DTO quando fizerem parte do produto.

## Fixtures e isolamento

Dados de teste propostos:
- tenant A e B com host real do harness; dono A, outro dono A, admin A e dono B.
- Público, oculto, rascunho, indisponível, restrito e patrocinado, cada qual com ID fixo da fixture.
- Perfil A com duas categorias e três itens; um item oculto, um agendado em janela conhecida, um destino público de stub aprovado.
- Séries com contagem e investimento conhecidos; a fixture deve semear visitantes distintos para a deduplicação atual não colapsar eventos esperados.
- T0 proposto `2026-10-14T12:00:00Z`; armazenar UTC e usar America/Sao_Paulo onde a regra existente já o faz; timezone do sistema não deve decidir resultado.
- Reutilizar e estender `backend/scripts/e2e-seed.ts` e `frontend/e2e/db.ts`; dado de feature tem namespace/ID próprio para não depender da ordem de testes.
- Fixture específica e oráculos estão em cada spec. Casos negativos usam contexto isolado, nunca cookies mutados manualmente para simular autorização concedida.

## Playwright sem falso verde

Usar getByRole/getByLabel e nomes acessíveis; data-testid apenas quando não houver semântica estável. Usar expect com auto-retry para resultado visível, API ou estado final. Não usar waitForTimeout para esperar worker, setTimeout arbitrário nem assertiva que verifica apenas toast antes da persistência.

Page.clock controla browser, não API, worker nem banco. Data de expiração/agenda no servidor exige Clock injetável ou fixtures com datas controladas e job executado deterministamente. Não alterar relógio global de produção para testes.

Simular apenas fronteiras externas: provedores de e-mail/IA/gateway/DNS/HTTPS em adapters/harness local. A API interna, BFF, banco e autorização permanecem reais. Para DNS/host seguro de teste, adaptar dependência explicitamente no ambiente isolado, sem abrir bypass público ou reduzir proteção SSRF de produção.

Testes E02 de privacidade devem inspecionar DOM e payload da resposta: ocultar visualmente dado sensível não basta. Testes de download esperam evento download, leem bytes e validam conteúdo. QR deve ser decodificado. Arte precisa de revisão visual de texto/overflow. PWA precisa de worker/cache real e também ensaio manual de instalação.

## Comandos futuros e diretório

Todos são exemplos de execução futura após criar os testes e registrar sua descoberta.

No backend:
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
- Caso U de feature: `npx vitest run src/domain/<modulo>/<feature>.spec.ts` com caminho concreto informado no plano.
- HTTP: `npx vitest run src/http/<feature>.http.spec.ts`.
- PG em PowerShell: definir `$env:PG_SPECS='1'` e URLs de banco descartável requeridas pelo teste; executar `npx vitest run --no-file-parallelism src/http/<feature>.pg.spec.ts`; ao final restaurar/remover só as variáveis criadas pelo teste.
- Repetir o conjunto PG registrado no script/CI após a feature. Não usar credenciais de produção.

No frontend:
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
- Caso C: `npx vitest run src/components/domain/<feature>.test.tsx`.
- Descoberta: `npx playwright test --list`.
- E2E: `npx playwright test e2e/<feature>.spec.ts --project=features`, somente depois de criar projeto features em G00. Hoje esse projeto não existe.
- Mobile: projeto features-mobile proposto, com mesmas jornadas essenciais; hoje não existe.
- Regressão do catálogo: `npx playwright test --project=catalog`; manter testes de sessão, pagamentos, moderação, SEO e consentimento aplicáveis.

Não rodar estes comandos por leitura deste documento. O usuário pediu planejamento, não execução.

## Definition of Ready

Fonte e escopo delimitados; dependências concluídas; decisões bloqueantes fechadas no registro; contratos e migração revisados; reutilização conferida; fixtures e cenários identificados; plano da feature revisado; autorização para implementar obtida no contexto adequado.

## Definition of Done

Todos os ACs aprovados com testes reais ou gate manual justificado; cenários U/C/I/PG/E exigidos passando; caso pulado ou teste ausente não conta como aprovado; lint/typecheck/build sem nova falha; testes descobertos no CI; regressões afetadas verdes; QA mobile/desktop/teclado; migração/rollback/rollout revisados; nenhuma exposição indevida de dados; responsável e evidência em S0–S7 e matriz. Não exigir porcentagem arbitrária de cobertura como substituto de comportamentos.

## Evidência por execução

Formato do registro: feature/etapa/AC; commit; ambiente e versão; data/hora UTC; responsável; comando e diretório; exit code; casos previstos/executados/pass/fail/skip; link do relatório/trace/screenshot ou arquivo manual; limitações; revisão. Guardar em `evidencias/Fxx/<run>/` ou link do CI, com run real no momento da execução. Nenhum diretório de evidência vazio representa teste aprovado.

Falha bloqueia avanço da etapa correspondente; registrar causa, correção e nova execução, preservando resultado anterior. Flaky não é aceito aumentando retries; investigar seed, relógio, sessão, filas e contaminação de estado.

## Fontes técnicas

- [Playwright best practices](https://playwright.dev/docs/best-practices): isolamento, comportamento visível, locators e assertions.
- [Playwright fixtures](https://playwright.dev/docs/test-fixtures): setup reutilizável com escopo explícito.
- [Vitest timers](https://vitest.dev/guide/mocking/timers): controle de tempo em unidade.
- Configurações locais citadas acima prevalecem sobre exemplos genéricos. Consultadas em 14 de outubro de 2026.

## Gate específico de F42 Evolution

F42 é primeira, após G00 mínimo e com provedor externo simulado. D44–D47 são os novos assuntos bloqueantes dessa integração; decisões de outras features não atrasam esta prioridade. Fixtures usam grupo e credenciais sintéticos, nunca o grupo real em CI.

Testar autenticação do webhook, vínculo de operador ADMIN ativo, revisão e disputa com painel, outbox, entrega incerta e os casos E01–E07 da spec. Ensaio real M01 depende de implementação e autorização futura de conexão e envio. Não assumir suporte a botões nem HMAC nativo na instalação.

