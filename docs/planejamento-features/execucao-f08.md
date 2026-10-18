# F08 — Oportunidades de busca

Estado: S0–S6 concluídas e validadas localmente; S7 em revisão (CI/liberação remotos não executados). Nenhuma publicação ou alteração em cobrança.

## Decisões e alternativas

- D09 aprovada pelo usuário: consentimento obrigatório, amostra mínima de 10 buscas e retenção de 180 dias. Reutilizar `tla_consent=marketing`, que já autoriza analytics no contrato atual. Alternativas descartadas: consentimento presumido ou criar outro aceite incompatível com o existente.
- Normalizar caixa, espaços e Unicode; preservar acentos. Alternativas: agrupar sinônimos com IA ou remover acentos; descartadas por custo e risco de unir intenções diferentes.
- Descartar termos com sinais de identificadores pessoais, contatos, URLs, segredos e sequências numéricas extensas. Não armazenar IP, agente de navegação, identificador de conta ou sessão original. O identificador de sessão é HMAC diário e por tenant; é pseudônimo, não anonimização absoluta.
- Uma observação por sessão, termo e dia; limite de 60 termos distintos por sessão/dia. Bots conhecidos, tráfego marcado de teste, DNT/GPC e administradores ativos ficam fora. Alternativa: contar toda atualização; descartada porque infla a demanda. Rotação deliberada de cookies continua sendo uma limitação.
- Resultado da busca, falha e bloqueio por idade são estados separados. Navegação direta para uma categoria não significa uma busca vazia.
- A busca atual não oferece filtros de rede/nicho na requisição. Registrar os IDs das categorias dos resultados efetivamente exibidos; no relatório, os filtros serão explicitamente “Rede nos resultados” e “Nicho nos resultados”. Buscas vazias ficam no conjunto sem filtro. Alternativa: inventar filtros silenciosos ou atribuir uma categoria arbitrária às buscas vazias; descartada por distorcer o comportamento observado.
- Interação significa clique de saída validado, vinculado à consulta e a um resultado que ela realmente exibiu. Não significa ingresso em grupo nem conversão. Alternativa: clique no card, descartada para manter uma medida verificável no servidor.
- Pouca interação: até 10% das buscas com resultado geraram saída; heurística de triagem, sem alegação estatística. Exibir somente grupos com 10 sessões/dias elegíveis, inclusive após filtros.
- Relatório dentro de Área de gestão, reutilizando abas responsivas, filtros, estados vazios e carregamento. Alternativa: nova navegação principal; descartada para não ampliar a complexidade do admin.

## Evidências em andamento

S0–S6: contratos, decisões, aplicação, migração e testes locais concluídos. S1: 13 testes de domínio; RED real da normalização e GREEN registrados em output/roadmap-f08. Componentes testados durante integração, com sequência real reconciliada abaixo. S7: revisão de liberação; sem CI, commit, push ou deploy.

## Contratos e reutilização implementados

- `SearchObservation` é aditiva e não reinterpreta `AnalyticsEvent`: IDs dos resultados e categorias são snapshots internos do servidor, com FK de tenant, chave única por sessão/dia/termo/desfecho, check de resultado e índices por tenant/período e sessão/dia. Sem backfill: os eventos anteriores não comprovam a consulta. Categorias removidas não impedem expurgo nem apagam retrospectivamente o agregado; o filtro usa categorias atualmente existentes.
- A gravação usa lock transacional por tenant/sessão; reaproveita a observação repetida somente se o conjunto exibido continua idêntico, sem alterar o snapshot. Um conjunto novo na mesma consulta/dia não inventa atribuição de clique. A consulta repetida não aumenta a amostra. Teto diário limita novas observações, sem impedir o reaproveitamento idempotente.
- HTTP da busca reutiliza ranking, idade, impressão e tokens existentes; autocomplete não coleta consultas. A falha do provedor continua 503 e gera estado FAILED quando elegível. Busca com resultados retidos por idade recebe GATED. Navegação exclusiva para uma categoria não entra como falta de oferta. A falha do armazenamento registra somente o código operacional, sem termo nem sessão, e não altera a resposta funcional. Analytics é auxiliar: não há fila de retentativas que atrase a busca ou duplique uma observação.
- `queryId` acompanha busca → detalhe → `/go`, sem alterar canonical, SEO ou destino externo. A associação valida a mesma sessão diária (inclusive virada do dia por até 24 horas), tenant, resultado real, superfície search e consentimento atual; dono/admin/suspenso, replay, consulta expirada ou destino ausente não geram outra saída.
- O admin exige conta ADMIN ativa no banco, além da sessão e tenant. O relatório filtra datas válidas em America/Sao_Paulo, até 180 dias, oportunidade e categorias dos resultados. O limiar é aplicado depois dos filtros. Falhas/restrições têm cobertura separada e contagens menores que dez são suprimidas. Paginação de 25, ordenação estável e respostas `private, no-store`. O prazo de 180 dias vale na leitura e no expurgo diário existente, mesmo se o worker atrasar.
- A UI reutiliza abas responsivas, Select personalizado, filtros recolhíveis no mobile, ações alinhadas à direita, EmptyState/ErrorState, SkeletonRegion e ícones locais. Não houve biblioteca nova. A política vem do servidor; skeleton inicial reserva seus campos e, ao atualizar, usa exatamente os dados e layout dos cards anteriores, preservando explicação e paginação para evitar encurtamento da página e salto de scroll. Respostas antigas são ignoradas.
- BFF e saída encaminham DNT/GPC e marcador explícito de teste. Política de privacidade descreve a nova coleta consentida sem alterar a base dos eventos anteriores.

## Cobertura e critérios

| Critério | Prova efetiva |
| --- | --- |
| AC01/T01 acesso administrativo | PG I05: sem sessão, usuário com claim ADMIN sem papel real, tenant alheio e conta suspensa; E02 confirma 401/403 pelo BFF. |
| AC02/T02 amostra | PG I02: nove ficam ocultas, décima libera; I07 reaplica após filtro; E01 nove → dez por busca pública e atualização do admin. |
| AC03/T03 tráfego inválido/abuso | PG I01 e I07: opt-out, agentes automatizados, marca de teste, admin, repetição e limite concorrente; E01 atravessa o BFF com DNT/GPC e consentimento. |
| AC04/T04 retenção | PG I06: linha vencida fora do relatório antes do DELETE, expurgo real; worker diário chama o mesmo repository. |
| AC05/T05 minimização | Domínio e PG I01 descartam e-mail, telefone, documento, URL e segredo; resposta/armazenamento sem sessão original. E01 verifica ausência de gravação e amostra não inflada. |
| AC06/T06 zero ≠ falha | Domínio, PG I03 e relatório: 503/FAILED, bloqueio GATED e zero SUCCESS separados; falha de persistência não transforma busca bem-sucedida em erro. |

S1 teve RED/GREEN real de normalização; os componentes foram testados durante a integração, sem fabricar um RED anterior ao código. Sete cenários PG também conferem FK/checks, concorrência, replay, snapshot de resultados, calendário, falha de armazenamento e paginação além da última página.

## Validação executada

Unitários: backend 473/110 arquivos; frontend 264/79 arquivos. PG: 19 cenários nas três suítes (F08, busca HTTP com SQL real e analytics/saída). Tipos, lint e builds dos dois pacotes executados; Next em cópia isolada, sem usar as portas do usuário. Playwright específico: quatro cenários, desktop/mobile, com teclado, Axe no painel, 320px/200%, consentimento, resposta real, detalhe/saída, permissão, rede lenta e recuperação. Regressão final: **32/32 cenários aprovados**, sem retry/skip, em um único relatório `e2e-regression-results.json` (legal, loading, F08 e workspace, desktop/mobile). Oito capturas de lista, atualização, skeleton inicial e 320px/200% foram inspecionadas e estão em [evidências F08](../frontend-profissional/evidencias/f08-2026-10-17). Posição e altura dos cards preservadas na atualização, com tolerância inferior a 1 px. Manifesto `source-manifest.json`: 53 arquivos de aplicação/teste/esquema conferidos, nenhuma divergência entre fonte e cópia validada. Lint/tipos finais e build Next também passaram depois do ajuste no menu.

Uma fixture inicial não incluía as configs obrigatórias da busca; foi corrigida sem mudar a regra. Uma inicialização flagrou condição redundante por estreitamento de tipo no toolbar; corrigida e compilada. O teste de rede lenta inicialmente liberava e removia a rota simultaneamente; passou após esperar a resposta real antes de remover a interceptação. A asserção de geometria revelou remoção da explicação durante loading, que encurtava a página no mobile; a UI preserva essa região e o teste mede posição e altura, sem aumentar tolerâncias. Uma tentativa PG coincidiu com o encerramento do banco pelo setup que falhou; a execução válida ocorreu com o harness pronto, e os relatórios anteriores foram mantidos como diagnóstico.

## Operação, reversão e limites

Migração `20261017233000_search_observations` aplicada em banco descartável e no desenvolvimento confirmado `localhost:5437`, onde era a única pendência. Não foi aplicada em produção. Logs/JSON locais em `output/roadmap-f08`; cópias temporárias de harness ficam ignoradas no Git, e oito capturas selecionadas estão mantidas em docs. Sem branch, commit, push ou deploy. S7 remoto permanece em revisão; não declarar CI ou produção validados.

Reversão: remover entrada do relatório e chamadas auxiliares da busca/saída/worker; preservar a tabela e os eventos antigos. Não há backfill nem dados comerciais para desfazer. Não remover tabela com dados como atalho de rollback; qualquer remoção exige migração compensatória e revisão de retenção.

A amostra mede sessões/dias elegíveis; não comprova dez pessoas únicas. UA e marcador de teste são filtros operacionais, não prova de humanidade. Rotação de cookies pode contornar o teto por sessão. A detecção de dados pessoais é conservadora e cobre sinais conhecidos; não é reconhecimento universal de qualquer nome ou dado sensível. Não se guardam IP/UA/contato para tentar resolver esse limite. “Pouca interação” é triagem por até 10%, não significância estatística nem garantia de demanda. Saída não comprova ingresso em grupo. Chromium mobile emulado não substitui um aparelho físico.

### Correção adjacente comprovada na regressão

A primeira regressão ampliada teve 29 aprovados e W04 mobile falhou. O trace mostrou o clique no menu antes do término dos chunks do painel e antes da chamada de sessão: o HTML já parecia interativo, mas o handler ainda não estava disponível. Um novo W06 bloqueia os scripts de propósito; falhou em RED porque o botão estava habilitado sem hidratação (`menu-red.log`). O menu agora fica desabilitado e com estado ocupado até seus efeitos de montagem terminarem, sem troca de tamanho ou desenho. Alternativas descartadas: sleep no teste, retry automático ou ignorar a falha; esconderiam a interação perdida. Teste unitário verifica HTML de servidor desabilitado e cliente pronto; W06 confirma a reativação e abertura real. A regressão final completa passou em 32 casos, incluindo o W04 original, sem aumentar timeout.

`EXPLAIN (ANALYZE, BUFFERS)` executado na consulta agregada em fixture local (`query-plan.log`); plano válido, filtro tenant/período, limites e índices revisados. Volume pequeno levou o otimizador a preferir varredura curta: isso não é benchmark ou garantia de desempenho em produção. Os índices suportam isolamento por tenant e janela; avaliar cardinalidade real antes de acrescentar GIN/índices extras. Cobertura mede observações deduplicadas por desfecho, não o número bruto de tentativas ao provedor.

### Comandos reproduzíveis

- Backend: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`; PG com `PG_SPECS=1`, URLs de banco descartável e `vitest run --no-file-parallelism src/http/search-opportunities.pg.spec.ts src/http/controllers/@Search/search-http.pg.spec.ts src/http/analytics.pg.spec.ts` → 19 aprovados.
- Frontend: `npm test`, `npm run lint`, `npm run typecheck`; `next build` executado pelo harness na cópia isolada.
- E2E: `E2E_RUN_ID=roadmap-f08`, offset 100 e `E2E_SEARCH_EMBEDDING=1`; entrada de teste substitui apenas embeddings externos, preservando SQL/ranking/BFF reais. Configs locais desativam setup duplicado quando o harness já está pronto. As suítes novas também estão registradas nos projetos features/features-mobile do config versionado.
- Nenhum processo alheio foi encerrado. Os serviços e containers exclusivos da tarefa são encerrados após consolidar as evidências. Documentação da F11 pode avançar sem alegar sua implementação ou venda.
