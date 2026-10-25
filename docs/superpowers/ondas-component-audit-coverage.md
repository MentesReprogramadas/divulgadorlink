# Cobertura consolidada dos componentes Ondas

Data: 2026-10-23. [CSV consolidado](ondas-component-audit-coverage.csv).

O recorte solicitado contém todos os arquivos de produção `.tsx` e `.css` em `frontend/src/app`, `components` e `features`, excluindo testes, specs, stories e pastas de resultados. São **535 arquivos: 417 TSX e 118 CSS**, uma linha por arquivo. O cruzamento usa as colunas `file`/`arquivo` dos inventários anteriores; a matriz de rotas não foi tratada como prova de revisão de arquivo.

Antes da consolidação, 496 arquivos tinham registro. As 39 lacunas eram CSS; cada folha foi lida e recebeu observação própria. Não foi encontrado TSX sem linha prévia. A existência dessa linha não comprova implementação completa, cobertura de testes por estado ou aprovação visual: os registros delegados e seus limites permanecem explícitos.

Três lacunas ativas de material encontradas nessa leitura foram corrigidas após autorização da raiz: WorkspaceFilters, FormSkeleton/DetailSkeleton e SearchContext de `/busca`. Cada uma agora monta a LiquidLens compartilhada em host transparente/isolado, preservando lógica, formulários, conteúdo e eventos. Validação: quatro arquivos/oito testes aprovados, lint dos três TSX e sintaxe dos três CSS aprovados. Sem abstração ou dependência nova.

HomePage de `components/domain/home-page.tsx`, `app/home.module.css` e o CSS do helper HomeExplore estão marcados como legados sem consumidor de produção encontrado. Não foram convertidos em nova UI. Bloqueio +18, busca e catálogo têm runtime coordenado pela raiz.

As 532 linhas não legadas mantêm **runtime pendente por arquivo**. Capturas e testes de rotas selecionadas não certificam todas as composições ou variantes de um arquivo. Os hashes correspondem à fonte no fechamento; validação documental confirmou 535 caminhos distintos existentes, nenhum campo obrigatório vazio e zero divergência de hash na gravação.

O lote posterior de W14 mantém as abas quando elas cabem na barra e permite ações na linha seguinte, preservando Select quando as próprias abas ultrapassam a largura. Testes focais: três arquivos/dezesseis testes aprovados; manutenção das abas observada falhando antes e passando depois. O E2E W14 e a investigação visual de W09 continuam coordenados pela raiz.

W09 teve diagnóstico posterior confirmado em `output/ondas-demo/width-diagnostic.log`: barras/eixos Recharts retinham largura de desktop após reduzir para 320px e ampliar texto para 200%, produzindo largura de documento de 767px. A correção limita somente a viewport local `.chart` com `overflow:clip` até o ResizeObserver atualizar o SVG. O foco mantém contorno interno; tooltips passam a quebrar texto e têm largura limitada. Não houve corte global de overflow, modificação do inner de largura zero do Recharts, aumento de prazo ou enfraquecimento do E2E. A aprovação do reteste real continua com a raiz.

Validação focal de W09: quatro arquivos/sete testes aprovados — gráfico real pelo teclado com anúncio do rótulo completo/valor, relatório/tabela, Tabs e ResponsiveTabs — além de lint dos dois TSX e sintaxe CSS aprovados. Extração incremental final: 7558 nós e 26976 relações; 14 arquivos reprocessados e 1483 reutilizados. Os hashes dos 535 arquivos de produção foram novamente conferidos, sem divergência.

Último delta de fonte: LinkMetrics registrado/em contagem, RecordsSkeleton e o indicador de retenção de InsightSkeleton usam a LiquidLens compartilhada e a classe local `linkMetric`, eliminando o fundo navy de `.metric` nesses três consumidores. Quatro arquivos/sete testes focais, ESLint4TSX e sintaxe CSS aprovados; runtime final continua com a raiz. Os hashes dos quatro arquivos de produção foram atualizados e os 535 hashes conferidos novamente.

A extração incremental local do Graphify não usa LLM/API/clustering. Após o delta das métricas: 7558 nós e 26981 relações, 14 arquivos reprocessados e 1483 reutilizados. O log está em `output/ondas-audit-graph.log`; os números finais e limites estão registrados em `graphify-out/ESCOPO.md`. CSS/docs/capturas não são validados pelo grafo.

Este agente não executou build, typecheck global, E2E ou navegador. A raiz coordena esses checks sobre a fonte final. Para reversão, revisar apenas os trechos e documentos deste lote, preservando alterações simultâneas.

No reteste da raiz em produção isolada na porta 3018, Axe identificou `label-content-name-mismatch` nos links de coleções da home. A raiz removeu o `aria-label` que omitia o título visível e informou RED→GREEN dos dois testes de HomeCollections. Nesta consolidação, fonte e teste foram relidos: o nome acessível deriva do conteúdo, o teste encontra assunto/título, e destinos/query permanecem verificados. Os 535 hashes foram atualizados após esse delta, sem divergência na conferência. A nova extração local reutilizou 1485 arquivos e reprocessou 12; manteve 7558 nós e 26981 relações. A execução integrada de 14 casos ainda estava em curso; a contagem final será registrada quando comunicada pela raiz. Nenhum novo ajuste de produção ou repetição de testes foi feito por este agente nesta extensão.
