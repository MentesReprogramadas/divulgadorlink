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
