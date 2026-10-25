# Execução F12 Link permanente para convites

Estado: CONCLUÍDA NA BRANCH, CI aprovado; execução encerrada após F12. A instrução mais recente limita a execução à F12 e exige parar ao concluí-la. Em 16/10/2026 o usuário autorizou continuar as features sem a parada anterior ao final de cada feature. A execução permanece em `codex/roadmap-features`, com commits e push autorizados pelo histórico da conversa. Main e deploy não fazem parte desta autorização.

## S0 Contrato e decisões

Reutilização examinada: redirecionamento de catálogo `@Links/go.ts`, BFF `/go/[linkId]`, canonicalização de URLs, `safe-fetch`, `probeAvailability`, F07 de correção de disponibilidade, validação automática da F09, autorização de publicação e contexto de tenant. A rota de catálogo mantém suas métricas e contratos. Um convite permanente precisa de identidade e histórico próprios, pois não equivale a uma nova entrada do catálogo nem a uma promoção.

Decisões inicialmente pendentes e resolvidas pelo usuário em 16/10/2026:

- Liberação: **“Aprovação automática quando todas as validações passarem; suspeitos ficam bloqueados para correção.”** A validação reutiliza os adapters e a decisão de texto existentes, sem encaminhamento humano implícito.
- Retenção F12/F19: **“Até 50 versões por 180 dias, preservando a publicação atual.”** O limite inclui a publicação atual; ao preservá-la fora da janela, ficam até 49 versões adicionais válidas.

Decisão D14: respostas de resolução com `Cache-Control: private, no-store`, redirecionamento temporário e nova consulta da revisão aprovada a cada acesso; endereço gerado pelo servidor, não alterável na entrada de atualização; destino inválido ou falha externa preservam a revisão pública anterior. Recuperar um destino histórico deve passar por uma nova validação. D14 resolvida com a resposta do usuário. Handle gerado como UUID, não editável/reciclável por entrada de API; ao desativar explicitamente fica inacessível. Na exclusão da conta, destinos e dados privados são apagados; IDs gerados não podem ser reivindicados por outro usuário.

## Preparação de validação

Foi criado o contrato puro de entrada `backend/src/domain/redirects/redirect-input.ts`, sem registrar rotas ou alterar o schema. Exige HTTPS, ausência de credenciais e portas especiais, rótulo de 1–100 caracteres, URL de até 2048 caracteres, UUID de reenvio e revisão esperada inteira. O identificador público não é aceito como campo de atualização. Esses limites são de entrada/engenharia, não quotas de plano.

`backend/src/domain/redirects/redirect-input.spec.ts` contém quatro testes preparatórios. Primeiro houve falha de import por ausência do módulo; isso não foi aceito como prova de comportamento. Com o contrato permissivo provisório, os quatro testes falharam nas asserções esperadas; após implementar a validação, os quatro passaram. Saídas em [RED](evidencias/F12/2026-10-16/domain-red.log) e [GREEN](evidencias/F12/2026-10-16/domain-green.log).

O contrato sintático não prova DNS seguro, moderação, disponibilidade, isolamento, persistência ou navegação. Essas verificações permanecem pendentes para as camadas de integração e E2E. Nenhum AC da F12 foi marcado como aprovado; S1 não foi concluída apenas por estes quatro testes.

A preparação inclui `backend/src/use-cases/@Redirects/validate-destination.ts`: compõe `assertPublicHttps`, `canonicalUrl` e a porta `UrlProbe` já usada pela F07. A validação de transporte exige resposta terminal 2xx; estado nulo ou exceção da porta produz erro recuperável 503 sem detalhes do provedor, e URL recusada/indisponível produz 422. Aprovação de conteúdo permanece uma etapa separada obrigatória, ainda não implementada. Três testes adicionais cobrem destinos privados incluindo IPv4 mapeado em IPv6, nenhuma chamada de rede para URLs proibidas, canonicalização, falha externa e resposta indisponível. Os sete testes preparatórios passaram; ver [validação GREEN](evidencias/F12/2026-10-16/validation-green.log). Não houve execução PG/E2E da F12 nesta preparação.

## Próximas etapas previstas na preparação (registro histórico)

Fechar as decisões pendentes, reconciliar a spec e então implementar persistência, validação de cada destino, resolução pública, painel, histórico e métricas por revisão/período. Executar os testes unitários, componentes, HTTP/PostgreSQL e Playwright, revisão real desktop/mobile e os checks completos antes de concluir a feature e avançar no roadmap.

## Efeitos e reversão

Até o registro preparatório, nenhum endpoint foi registrado, nenhuma migration foi criada/aplicada e nenhuma configuração de produção foi alterada. Os arquivos preparatórios novos podem ser removidos sem afetar a funcionalidade existente. Os arquivos locais preexistentes continuam preservados.

## Checks do lote preparatório

Backend: lint, typecheck, suíte completa com **431 testes aprovados** e build, todos com exit code 0. Logs `backend-lint.log`, `backend-typecheck.log`, `backend-unit.log` e `backend-build.log` na pasta de evidências desta execução. Sem alteração de frontend; PG, E2E e CI da F12 ainda não executados.

## Regressão de foco encontrada durante a preparação

O commit preparatório `f9a611f` disparou o [CI 38963209066](https://github.com/MentesReprogramadas/divulgadorlink/actions/runs/38963209066). Verify, web e images passaram. O E2E teve 91 sucessos e uma falha em F04-E03 mobile: a confirmação de criação de coleção estava visível, mas não recebeu foco. A F12 ainda não registra endpoints ou páginas e não é exercitada por essa jornada.

A investigação verificou o código de favoritos e a captura do CI. `requestAnimationFrame` não assegura que o commit do React já inseriu o texto de confirmação; o CSS oculta `.status:empty`. Um novo teste reproduziu a tentativa de foco com texto vazio. A correção em `FavoritesScreen` usa `useLayoutEffect` dependente da confirmação, focando depois da atualização do DOM. O teste de regressão passou sem remover a asserção de foco do Playwright ou aumentar timeouts. Frontend lint, typecheck, suíte completa com 197 testes e build passaram. A regressão completa local passou: **92 E2E**, sem skips/retries, com containers próprios `f12-focus-review` e portas com offset 100. O harness encerrou os próprios serviços ao final. A confirmação de foco foi verificada nos testes desktop/mobile existentes, sem enfraquecer o aceite; as capturas desktop/mobile foram abertas e revisadas. O CI do commit `1066fec` (38964298636) aprovou favoritos e falhou em F09-E03 mobile pela mesma tentativa de foco antes da confirmação de rascunho ser renderizada (91 E2E passaram). O teste de regressão do editor reproduziu o texto vazio no momento da tentativa de foco. A mesma correção local de sincronização foi aplicada ao editor de perfil; nenhum fluxo de publicação, validação ou autorização foi alterado. A correção final está no commit `1ae4b6f`: frontend lint/typecheck/build e 198 testes passaram. As jornadas afetadas passaram novamente em desktop/mobile: 15 Playwright (setup + favoritos + perfis), sem skips/retries, execução isolada `f12-focus-final`. CI final 38965255619 aprovado nos quatro jobs. Evidências na mesma pasta da F12, com identificação explícita de que a correção pertence à F04.

## Implementação após as decisões

Modelo aditivo RedirectHandle/RedirectDestination/RedirectDaily, com relações de tenant/dono, identidade por UUID, versão otimista e chave de reenvio. A reserva PENDING é gravada antes das chamadas externas, mantendo o destino ativo. A conclusão revalida usuário/versão em transação; validação lenta não vence uma alteração posterior. Resultados BLOCKED/FAILED permanecem privados para correção. O erro privado inclui `resource{id,version}` para continuar a correção no mesmo endereço. Uma tentativa com erro definitivo repetida pela mesma chave retorna o mesmo erro; uma nova validação usa nova chave. Tentativa interrompida PENDING pode ser retomada pela mesma chave.

GET `/api/v1/me/redirects` pagina 25 itens por cursor; POST cria; GET `/:id` mostra até 50 revisões e métricas por período; POST `/:id/destinations` valida e troca; POST `/:id/disable` exige confirmação/versão e desativa definitivamente. GET/HEAD `/api/v1/r/:id` resolve exclusivamente revisão aprovada, dono ativo e tenant correto; verifica disponibilidade/DNS seguro a cada acesso, sem cache, e não entrega título/destino antes de consentimento de idade. Mudança concorrente durante o probe retorna estado indisponível recuperável. HEAD não conta acesso.

Métricas: contadores operacionais anônimos de redirecionamentos por revisão/dia em America/Sao_Paulo, incluindo repetições; sem sessão, IP, telefone, referrer ou user agent. Dono/admin ativos são excluídos. Não misturar com métricas de destaque ou alegar visitantes únicos. Dados acima de 180 dias são expurgados junto da rotina diária existente e na leitura detalhada/mutação. Preservar a revisão publicada não preserva seus contadores antigos.

Reuso: fábrica de portas de validação pública extraída da F09 para uso real por F09/F12, preservando alias/consumidores de perfil. A UI usa Field/Input/Button, AreaFrame, tokens e AgePrompt existentes; CSS Modules local. Refero indisponível no catálogo desta sessão; referência GOV.UK Check answers inspecionada visualmente no Chromium (hierarquia, separação campo/valor/ação), junto das capturas reais do painel de favoritos. Sem copiar identidade externa ou adicionar dependências.

Falha PG inicial: o contexto do controller continha campos adicionais e o spread do ator os enviava ao Prisma. Corrigido com allowlist explícita tenantId/ownerId; os dez casos iniciais passaram. Na ampliação de constraints, um fixture de número 999 fez uma asserção procurar a primeira revisão incorreta; a asserção foi corrigida para a revisão 2, mantendo o oráculo de rollback.

Ao conferir exclusão de conta, a base anonimiza o usuário em vez de excluí-lo fisicamente; cascatas de perfil não eram acionadas. A exclusão agora serializa pelo usuário e apaga explicitamente perfis/mídia/convites na mesma transação. Teste PG real exercita a implementação de exclusão, preservando os contratos anteriores do catálogo.

## Validação e correções finais — 16/10/2026

Reenvios simultâneos com a mesma chave revelaram uma resposta incoerente: a primeira chamada aprovava e uma validação tardia respondia 503. O teste reproduziu a falha; a conclusão agora retorna a decisão já persistida, preservando revisão única e destino. Evidências `concurrent-retry-red.log` e `concurrent-retry-green.log` (15 PG aprovados). CSRF sem header foi recusado sem efeito; header correto permite mutação. Suspensão, isolamento, exclusão real de dados privados, concorrência, desativação, falha transacional e retomada de PENDING são verificados no PostgreSQL.

O teste antigo de catálogo alterava o fuso de um banco chamado literalmente divulgador. Foi corrigido para identificar o banco corrente, guardar a configuração anterior e restaurá-la no final. Isso permitiu a regressão no banco próprio f12_pg_checks com todas as migrations. Tentativas anteriores com URLs de teste incompletas, ledger ausente no clone e fuso global incorreto estão preservadas nos logs, substituídas pela execução final. Nenhum banco de produção foi utilizado.

O primeiro E2E encontrou limitações do harness: interceptação de navegação externa após 302 e DNS de subdomínio localhost na requisição Node. O harness agora oferece servidor HTTPS externo local com certificado/chave exclusivamente sintéticos documentados, Chromium convidado com mapeamento DNS restrito a esse contexto, e requests HTTP com Host explícito. API, BFF, PostgreSQL, worker e Redis continuam reais. A validação TLS/DNS de produção permanece intacta. A segunda execução dirigida passou os nove testes (setup + quatro cenários em dois projetos), sem skips/retries. Logs de falha foram sanitizados; traces com sessões sintéticas não são versionados.

Inspeção real no Chrome: criação/publicação, seleção, histórico, campos e confirmação em 1280×720 e 390×844 touch. Capturas `manual-desktop.png` e `manual-mobile.png` abertas e revisadas; sem overflow horizontal, hierarquia h1/h2/h3 coerente, foco de confirmação azul de 3px. Playwright verifica teclado/Enter, preservação offline, conflito entre abas, reflow 320px com texto 200%, conteúdo restrito e ausência de URL privada antes da idade. Capturas determinísticas de formulário/indisponibilidade/reflow também revisadas. Não houve ensaio em aparelho físico, leitor de tela ou zoom nativo de navegador; não alegar acessibilidade total nem baseline visual pixel a pixel.

## Migração, desempenho e reversão

Migration aditiva `20261016190000_permanent_redirects`: três tabelas, índices, FK composta e trigger que exige revisão aprovada para publicação. Sem backfill do catálogo, sem alteração de dependências/lockfiles. Ensaio no clone descartável preservou contagens e fingerprints das 42 tabelas anteriores, inclusive após inserir 10 mil handles, revisões e contadores sintéticos. EXPLAIN ANALYZE usou os índices de identidade, página de dono, número de revisão e período; ver `migration-proof.json`, `query-plans.json` e `rollback-proof.json`.

Reversão: retirar o código da F12 mantendo a migration aditiva e os dados; nunca resetar ou apagar históricos para desfazer. O ensaio comprova preservação de dados/compatibilidade do schema, mas não executou um binário antigo em produção. Rollout futuro: aplicar migration antes da API/worker e frontend, verificar resolução/criação em staging e acompanhar falhas 422/503, latência de probe e retenção. Não foi criada flag comercial ou uma fila nova: o expurgo usa o worker diário existente. Nenhum deploy/main/configuração de produção foi alterado.

## Reconciliação do plano e limites

Arquivos sugeridos no plano inicial foram substituídos por responsabilidades reais: `redirect-input.spec.ts`, `validate-destination.spec.ts`, `redirects.pg.spec.ts`, `redirect-screen.test.tsx` e `e2e/redirects.spec.ts`. U03/U04 e a preservação do destino U01 exigem persistência/HTTP e são comprovados em PG/E2E, em vez de simular cache com teste puro. Sete testes de validação puros, três de componentes e quinze PG compõem a cobertura específica. Os testes de componentes foram construídos junto da UI; não existe registro RED anterior de todos eles. O RED de domínio e o de concorrência foram preservados; não se declara TDD integral retroativo.

ProfileItem pode usar a URL pública como qualquer URL própria validada; a relação dedicada era opcional e não foi acrescentada sem necessidade. Recuperação histórica é uma nova submissão do destino, sujeita às validações, sem restauração direta de uma revisão antiga. Prévia e QR não pertencem a esta entrega. HTTP 2xx e classificação do título/URL não comprovam que um convite de uma rede aceita ingresso nem classificam todo o HTML remoto; não há promessa de inspeção semântica permanente. O destino anterior aprovado permanece nas falhas. Contadores são operacionais e incluem repetições, não audiência única.

## Encerramento solicitado

Após a validação final e o CI desta entrega, atualizar os ledgers com o SHA exato e encerrar. A F19 não foi iniciada; sua decisão de retenção está registrada apenas como contrato futuro. A autorização contínua anterior foi limitada pelo pedido mais recente: finalizar a F12 e parar.

## Aceite final

Código `1809e1d97f0b7e7681409041a2073412352d91d6`, branch `codex/roadmap-features`. [CI 38971032480](https://github.com/MentesReprogramadas/divulgadorlink/actions/runs/38971032480) aprovado em verify/web/images/e2e; resultado bruto em `ci-implementation.json`. Os cinco ACs F12-T01–T05 estão aprovados na matriz; S0–S7 no CSV/roadmap. Os desvios de sequência e limites acima continuam válidos.

| Verificação local | Resultado | Evidência |
| --- | --- | --- |
| Backend lint/typecheck/build | exit 0 | backend-final-*.log |
| Backend unitários/HTTP | 431 aprovados, 103 arquivos | backend-final-unit.log |
| PostgreSQL completo | 152 aprovados, 15 arquivos | pg-final-all.log |
| Frontend lint/typecheck/build | exit 0 | web-final-*.log |
| Frontend componentes/unitários | 201 aprovados, 61 arquivos | web-final-unit.log |
| Playwright completo desktop/mobile/catalog | 100 aprovados, sem skips/retries | e2e-final.log |

Execução E2E `f12-final`, offset 100: containers próprios PostgreSQL/Redis nas portas 5533/6480; Next/API/stubs 3100/3433/4199/4543. Teardown encerrou somente os processos/containers registrados. Ambiente baseline e arquivos locais alheios preservados. Migration também aplicada desde o início em banco próprio de PG. Build web final repetido após teardown para evitar concorrência de `.next`.

Observabilidade usa evento sanitizado `redirect.failed` com request_id/código, sem destino privado ou dados pessoais. A entrega foi enviada à branch autorizada. Nenhum deploy ou alteração na main foi feito. Trabalho encerrado na F12; F19 e demais features não iniciadas.


## 17/10/2026 — marca discreta e revisão de páginas/convites

Autorização específica posterior: assinatura pequena e ciclo IA → aprovação automática ou humano → recusa/contestação para F09/F12. Implementação local versionada por envio, sem consumir quotas de Link. [Registro e critérios](../frontend-profissional/revisao-paginas-convites.md) descrevem reuso, testes, migração e reversão. Sem avanço de ordem, nova feature, commit, push ou deploy; fases históricas e seus CI permanecem históricos.

## Extensão de 17/10/2026 — páginas e convites no WhatsApp

Por novo pedido expresso, revisões humanas de F09/F12 e suas contestações também usam o grupo Evolution configurado, a mesma autorização por operador ADMIN e a mesma operação de decisão do painel. O aviso citado identifica a versão exata; expiração, substituição e contestação invalidam mensagens anteriores. Decisão e registro do aviso de confirmação são atômicos, sem alterar aprovação automática, regras de segurança ou cobrança. Avisos ganham símbolos distintos por evento e mantêm seções curtas.

Contrato, critérios, limites, evidências e resultados no [complemento da implementação](../frontend-profissional/revisao-paginas-convites.md#complemento-autorizado--aprovação-pelo-whatsapp).


## Nomenclatura e navegação posterior — 21/10/2026

Revisão autorizada: recurso público chamado Links permanentes; distribuição chamada Distribuir acessos. Telas, campos, erros, QR e avisos atualizados. Convites de equipe permanecem distintos; URLs, grants e regras não mudaram. [Mapa e evidências](../frontend-profissional/sidebar-por-contexto-2026-10-21.md).
