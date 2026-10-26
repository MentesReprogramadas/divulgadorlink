# Links relacionados quando o contexto é reconhecido

## Correção

Resultados e sugestões compartilhavam a interpretação de nichos/redes, mas a classificação semantic podia zerar os links por falta de correspondência textual/vetorial. A consulta pública anterior ao deploy reproduziu o problema em uma combinação de tema/rede; evidência sem material ou URLs de links em `output/search-related-production-before.json`.

O carregador compartilhado agora prioriza o assunto específico. Sem candidatos que atinjam o limiar e com facetas reconhecidas, ele repete a busca pelo mesmo nicho/rede, sem nova chamada ao modelo ou aos embeddings. Reaproveita SQL, filtros, tenant, publicação, bloqueio de dono banido, pesos/limiar e patrocínio. A visibilidade por maioridade continua aplicada antes da resposta pública, inclusive no autocomplete. Não cria recomendações fora do contexto quando não há facetas.

É uma ampliação autorizada pelo usuário: os links recomendados podem tratar do tema geral quando não existe correspondência específica. Não muda modelo/prompt, dependências, banco, interface ou limites comerciais. Falhas de provedor conservam o tratamento atual; limiar superior à evidência da faceta pode manter uma resposta vazia.

## Verificação

- Dois novos cenários falharam antes da correção por listas vazias, incluindo o aceite +18. Após a correção, os 38 testes focais de rota/adaptador passaram. Sem contexto continua vazio; com resultado específico, links genéricos continuam fora.
- Nove testes HTTP com SQL real passaram. A nova regressão verifica recomendações nas duas rotas e mantém bloqueios de tenant, rascunho, dono banido, outra rede, idade, idioma e limiar elevado.
- 26 E2E desktop/mobile passaram. As fixtures simulam a classificação semantic sem correspondência observada em produção; usam adaptador e SQL reais com provedor controlado. A confirmação, recusa, teclado, foco, paginação, filtros e proteção de mídia continuam cobertos. Nenhuma imagem adulta real foi aberta.
- Frontend: 793 testes, lint, tipos da aplicação/E2E e build de produção pelo setup aprovados. Capturas de 1440/390 px inspecionadas; recomendações legíveis, sem mudança de apresentação.
- Backend: lint, tipos e build aprovados. A primeira rodada ampla teve 732 aprovados e duas falhas nas provas locais de Pix (`pix-expiration.redis.spec.ts` e `pix-worker.redis.spec.ts`), que usaram o banco local padrão antigo. Os scripts fazem limpeza dos próprios registros. A repetição apontou explicitamente `PIX_PROOF_DATABASE_URL` e `PIX_PROOF_REDIS_URL` aos recursos descartáveis desta tarefa: 734/734 passaram, em `output/search-related-backend-full-unit-recheck.log`.
- Seis testes dos guards de deploy passaram. Graphify incremental local: 14 arquivos reprocessados, 1616 reutilizados, 9516 nós/35644 relações; sem LLM/API/clustering. Inclui mudanças concorrentes da árvore, não somente esta correção.

Logs e capturas em `output/search-related-*`. Validação isolada sobre a main `00bb5194`, preservando o laboratório e as alterações de outras tarefas. A publicação depende do CI do novo SHA; estado final dos serviços e probes reais serão registrados no arquivo operacional em output, sem credenciais.

## Reversão e limites

Reverter somente o commit desta correção e validar/publicar o novo SHA. Não há migration. A disponibilidade das recomendações depende de facetas reconhecidas e links publicados elegíveis; não se promete correspondência exata para todo texto. O teste local do provedor é controlado; a conferência pública após deploy cobre as frases que motivaram o ajuste e os estados de maioridade, sem abrir destinos ou imagens dos links.

## Complemento: prioridade dos links e tempo das sugestões

O usuário acrescentou o problema de categorias ocupando o início das sugestões e relatou 288 ms de rede para o prefixo B. A medição anterior, pelo mesmo cliente fetch reutilizando conexão, registrou 305/289/289 ms após a primeira conexão de 885 ms. Não é uma medição universal nem isola somente o servidor. Havia mais 350 ms de espera na interface antes da chamada.

Links agora vêm primeiro no DOM e na navegação por teclado; os destinos de nicho/rede ficam depois. Na página de resultados, os cards também precedem o contexto, com separação de espaço. A interface preserva a marca e os componentes existentes.

O campo consulta o caminho rápido após 150 ms. Esse caminho usa a consulta literal e as facetas existentes, sem aguardar IA ou embeddings. Quando não existem links rápidos e a maioridade não exige confirmação, uma pausa adicional de 350 ms agenda a interpretação completa. O estado de busca contextual aparece sem bloquear a navegação já disponível. Nova digitação, Escape, blur, composição IME e mudança de filtros continuam cancelando requisições/agendamentos e ignorando respostas superadas. A seleção ativa é limpa quando a lista muda, evitando que uma categoria selecionada se transforme em outro destino.

As leituras independentes de configuração, contexto público, contagens e mídia rodam em paralelo. Não há cache de resposta dependente de idade. O SQL literal foi mantido e passou a usar uma fonte injetada, como a busca semântica já usava: isso permite testar o caminho rápido com PostgreSQL real, em vez de a condição NODE_ENV=test desviá-lo silenciosamente para fixtures em memória.

Verificação do complemento: 20 testes focais de interface e 40 de backend aprovados; rodada integral final com 797 testes frontend e 736 backend, lint/tipos/build aprovados. Nove testes de banco passaram, incluindo busca rápida com tenant/publicação/idade/no-store. A primeira tentativa desse novo caso encontrou o desvio para fixture em memória; uma repetição também usou a cópia antiga porque o comando de sincronização apontou para o diretório errado. O caso passou após a injeção explícita da fonte SQL e a sincronização correta. Não foi removida a assertiva de links ou idade.

26 E2E desktop/mobile passaram novamente, incluindo resposta rápida seguida de contexto retido por uma barreira de rede controlada, prioridade dos links e confirmação/recusa +18. Capturas do popup e dos resultados foram inspecionadas. O refinamento final de espaçamento e a inspeção adicional ficam nos artefatos `output/search-suggestions-*`/`output/search-links-*`. O Playwright MCP foi tentado antes/depois da janela do servidor descartável e recebeu conexão recusada; isso não invalida as capturas e interações reais da suíte.

O commit intermediário 14b4893e passou nos 22 grupos de qualidade e não foi publicado enquanto o complemento era integrado. A verificação posterior do log confirmou `api: application ID missing`, em vez da ausência de token inicialmente presumida: a secret já estava configurada. O SHA 025614b0 também passou nos 22 grupos e encontrou o mesmo bloqueio antes de qualquer mutação automática. Graphify incremental final do complemento: 9517 nós/35648 relações, incluindo mudanças concorrentes; sem LLM/API/clustering. Detector mecânico Impeccable dos componentes e do CSS alterados retornou lista vazia.

A redução de espera da interface é comprovada por relógio controlado; a latência de rede e a interpretação de frases novas ainda variam. A publicação não promete que toda chamada ficará abaixo de 288 ms. Reverter os dois commits desta entrega restaura a busca anterior; o banco permanece compatível.

## Compatibilidade da publicação automática

A API REST real respondeu HTTP 200 com o UUID da aplicação e auto-deploy desativado, sem expor o ID interno; a fila de deploys continua sendo um array. O script passa a usar esse UUID verificado quando o ID não estiver presente. Mantém a checagem por ID das respostas antigas, a exclusão de publicações concorrentes, o SHA corrente da main, origem HTTPS, credenciais e saúde. Uma entrada de fila que não possa ser relacionada com segurança é recusada antes de qualquer alteração.

Dois testes reproduziram o bloqueio anterior; os oito testes de deploy passaram após a correção, incluindo ID omitido e entradas concorrentes/sem identidade. A publicação manual de 025614b0 segue a mesma ordem API → worker → web, usando o SHA testado e identificadores oficiais. A compatibilidade do CD não muda os arquivos executados pela aplicação nem exige migration; o próximo CI da main deverá confirmar a automação com o token já disponível.
