# Busca híbrida: arquitetura de recuperação

> Status: **ARCHITECTURE LIMITATION — FULL RESULT SET** (decisão de produto da Task 13, 2026-10-01: a busca continua devolvendo todos os elegíveis, de forma exata). Aplicados: correção do plano genérico (3.1) e desempate determinístico por id (seção 10). `rankSearch`, `hybridSearchSql()` (fora a 3.1) e o contrato `GET /api/v1/search` estão intactos. Não há paginação nem índice novo. O limite de escala está documentado na seção 10.
> Dados do benchmark: **sintéticos**. Embeddings gerados por centróides, sem OpenAI. Servem para medir custo e paridade, não para prever a distribuição real de similaridade.

## 1. Contexto

Código atual:

- `hybridSearchSql()` em `backend/src/use-cases/@Search/rank-links.ts`.
- A rota está em `backend/src/http/controllers/@Search/routes.ts`.

Como a busca funciona hoje:

1. `embed(query)` é chamado na OpenAI (`text-embedding-3-large`, 1536 dimensões).
2. O SQL calcula `ts_rank('simple')` e `1 - (embedding <=> q)` para **todos** os links publicados e visíveis do tenant.
3. O SQL filtra `0,4·texto + 0,6·semântica ≥ 0,35`, sem `ORDER BY` e sem `LIMIT`.
4. Em memória, `rankSearch` separa os patrocinados (SEARCH ativo, ordenados por `activatedAt`) dos orgânicos (ordenados por relevância).
5. A resposta devolve **todos** os elegíveis, sem paginação.

O índice `links_embedding_hnsw_idx` (HNSW, `vector_cosine_ops`, m=16, ef_construction=64) existe, mas essa consulta não consegue usá-lo.

## 2. Requisitos que qualquer alternativa precisa preservar

| Requisito | Onde está hoje |
|---|---|
| Tenant pelo host | SQL `$3` |
| Só `PUBLISHED` | SQL |
| Idade (`requiresAge` do nicho) | SQL `$4` |
| Limiar mínimo, que vale também para SEARCH pago | SQL `$7` e `rankSearch` |
| Patrocinado ordenado por `activatedAt`, sem leilão | `rankSearch` |
| Patrocinado excluído do orgânico | `rankSearch` |
| Orgânico ordenado por relevância | `rankSearch` |
| Embedding nulo (`PENDING`/`FAILED`) elegível só pelo texto (`COALESCE(…, 0)`) | SQL |
| Nicho e rede: **não filtram a busca**. Consulta igual a nicho público vira redirecionamento de faceta | `resolveSearchTarget` |
| Paginação: **não existe** | contrato atual |

## 3. Achados que mudam a decisão

### 3.1 A busca degradava 10 vezes depois de 5 execuções. Corrigido, sem mudar contrato

O Prisma reaproveita o prepared statement. A partir da 6ª execução na mesma conexão, o Postgres (`plan_cache_mode=auto`) troca para o **plano genérico**. Nele, `$2::vector` (texto com 1536 números) é reparseado **por linha**.

Medido via Prisma, com 10 execuções seguidas da mesma consulta:

| Escala | Plano custom (1ª a 5ª execução) | Plano genérico (6ª em diante) | Vetor materializado uma vez (proposta) |
|---|---|---|---|
| 10k | 38–56 ms | **560–575 ms** | 37–43 ms |
| 100k | 196–223 ms | **2.029–2.076 ms** | 198–260 ms |

- As linhas retornadas pela proposta são idênticas às atuais (`sameRows: true`, 2.943 = 2.943 em 100k).
- A medição anterior de "cerca de 200 ms em 100k" usava EXPLAIN, que sempre é planejado como custom. **A latência real da API em regime estável é cerca de 2 s em 100k.** Projeção linear para 1M, não medida: cerca de 20 s.
- Reprodução: `backend/scripts/bench-plan-cache.ts`.

**Correção aplicada:**

- `hybridSearchSql()` começa com `WITH query_embedding AS (SELECT $2::vector AS v)`. As duas referências ao vetor (`semantic_score` e limiar) usam `(SELECT v FROM query_embedding)`.
- Sem `MATERIALIZED`. O EXPLAIN mostrou plano idêntico com e sem a palavra, porque o CTE referenciado duas vezes já é materializado pelo Postgres.
- Parâmetros, filtros, colunas, limiar, pesos, `rankSearch`, patrocínio, autocomplete e contrato da API: inalterados.
- Por que o plano genérico deixa de degradar: o cast acontece num `Result` com `loops=1`. Os InitPlans devolvem o vetor já convertido, e o scan compara com um parâmetro pronto em vez de reparsear 1536 números por linha.

Benchmark depois da correção. Dados sintéticos, `plan_cache_mode=auto`, 10 execuções na mesma conexão (`pg_backend_pid` constante, `generic_plans=1`). "Antes" é a cópia congelada do SQL legado:

| Escala | Antes, execuções 1 a 10 (ms) | Depois, execuções 1 a 10 (ms) | Antes: média / pior / melhor | Depois: média / pior / melhor | Linhas |
|---|---|---|---|---|---|
| 10k | 51, 42, 41, 40, 39, **567, 575, 568, 578, 565** | 48, 44, 43, 47, 42, 43, 42, 43, 41, 42 | 307 / 578 / 39 | 44 / 48 / 41 | 292 = 292 |
| 100k | 235, 201, 209, 198, 197, **2073, 2095, 2082, 2091, 2106** | 235, 197, 196, 213, 206, 208, 218, 206, 210, 201 | 1149 / 2106 / 197 | 209 / 235 / 196 | 3087 = 3087 |

- Equivalência: ids, `text_score`, `semantic_score`, `embeddingState` e `search_activated_at` idênticos (`mismatches: 0`) nas duas escalas.
- `EXPLAIN (ANALYZE, VERBOSE, BUFFERS)` em 100k, plano genérico forçado:
  - legado: `($2)::vector` no `Filter` e no `Output` do scan, ou seja, por linha; 2.147 ms;
  - corrigido: `($2)::vector` só em `CTE query_embedding -> Result (loops=1)`; 178 ms.
  - Nos dois: mesmo `Recheck Cond` (tenant e `PUBLISHED`), mesmo filtro de idade no nicho, `Rows Removed by Filter: 25285`, 3.087 linhas e buffers equivalentes (cerca de 335 mil hits).
- Regressão: `backend/src/use-cases/@Search/hybrid-search.pg.spec.ts`, incluído em `test:pg`. Compara legado com atual em 8 cenários (muitos resultados com patrocinado, adulto liberado, limiar 0,6, poucos resultados, sem palavras em comum, só texto, sem resultado, outro tenant). Também roda 10 vezes na mesma conexão e verifica, no plano genérico, que o cast ocorre uma única vez. O spec falhou contra o SQL antigo (execuções 6 a 10 em 176–189 ms contra 19–36 ms) e passa depois da correção.

### 3.2 `ts_rank` não tem teto baixo, e o caso só-texto existe

- Um termo só fica abaixo de 0,1.
- Com vários termos e stuffing, chega a 0,99999, **inclusive com match parcial**: `@@` falso porque falta um termo, e mesmo assim o rank é cerca de 1.
- Exemplo: `repeat('vagas emprego ', 300)` contra a consulta "vagas emprego remoto" dá `ts_rank = 0,9999997` com `@@ = false`.
- Consequências:
  - Um link pode ser elegível **só pelo texto** (`0,4·1 ≥ 0,35`), inclusive com embedding nulo.
  - Recuperação puramente semântica **perde** esses casos.
  - Um ramo textual com GIN e `plainto_tsquery` (AND) também perde. Preservar exige tsquery com OR de termos.

### 3.3 O contrato sem limite é o gargalo estrutural

- No sintético de 100k, os elegíveis por consulta vão de 1 a **4.004 linhas**, todas devolvidas ao cliente.
- Qualquer estratégia com limite K em que K seja menor que o número de elegíveis **muda o resultado**, por definição.
- O HNSW só compensa com K pequeno, por volta de 100 ou menos.
- Sem decisão de produto sobre paginação ou limite da resposta, nenhuma alternativa indexada preserva o comportamento atual.

## 4. Alternativas

### A. HNSW top-K, depois filtros, scores e `rankSearch`

```sql
WITH ann AS MATERIALIZED (
  SELECT l.id FROM links l JOIN niches n ON n.id = l."nicheId"
  WHERE <tenant, PUBLISHED, idade> AND l.embedding IS NOT NULL
  ORDER BY l.embedding <=> $2::vector LIMIT $K)
SELECT <mesmos scores> FROM links l JOIN ann USING (id) WHERE <mesmo limiar>
```

- **Perda de candidatos:** todo elegível além do K-ésimo vizinho, mais todo elegível só pelo texto e todo link com embedding nulo.
- **Patrocinado pago:** pode ser perdido mesmo estando acima do limiar. Medido: `sponsoredOk=false` com K=100, 500 e 1000 em 100k. **Isso é dano financeiro direto.**
- **Filtros:** com `hnsw.iterative_scan=off`, o filtro de tenant depois do índice esvazia o resultado de tenants pequenos. Com `relaxed_order` (pgvector 0.8.x), o pgvector continua varrendo até `max_scan_tuples` (padrão 20.000) e então para em silêncio.
- **Escolha de K:** não existe K fixo correto, porque o número de elegíveis varia de 1 a 4.004 conforme a consulta.
- **Planner:** com K de 500 ou mais em 100k, ele **abandona o HNSW** (`Parallel Seq Scan` mais sort top-N).
- **Conteúdo recém-publicado:** entra no HNSW na hora (inserção incremental). O risco é embedding `PENDING`, que fica fora.
- **Veredito:** rejeitada como substituta direta, porque muda resultados e perde pago.

### B. Texto top-K1 mais HNSW top-K2, com união e deduplicação

- **Cobertura:** o ramo textual só recupera o caso de stuffing se usar tsquery com OR. Com AND, perde (3.2).
- **Custo:** o ramo textual exige um índice GIN novo (migration e escrita extra em cada insert ou update de nome e descrição). Sem GIN, é seq scan.
- **Medido com GIN (100k):** ramo textual isolado em 2 a 41 ms. Sozinho, perde 100% dos elegíveis só-semânticos (consulta sem termo em comum: 689 perdidos).
- **Estabilidade:** com dois K fixos, a união ainda trunca nos dois ramos. O problema 3.3 continua.
- **Veredito:** só faz sentido como componente da D.

### C. Pré-filtro relacional mais HNSW

- O pgvector não aplica filtro relacional **dentro** do grafo. Ele filtra depois de cada lote.
- **Medido:** com o filtro de tenant, idade e status, o HNSW **foi usado** com K=100 (`Index Scan using links_embedding_hnsw_idx`, 1,5 ms) e **não foi usado** com K de 500 ou mais.
- Índice parcial por tenant não escala com tenants dinâmicos. Particionar por tenant é custo operacional alto.
- **Veredito:** é a A com filtros, com os mesmos limites.

### D. Dois estágios: recuperação barata, depois ranking híbrido completo

- **Estágio 1:** união de três conjuntos:
  - HNSW com K adaptativo;
  - ramo textual com GIN e OR, filtrado por `ts ≥ (0,35 − 0,6·s_K)/0,4`;
  - todas as promoções SEARCH ativas do tenant (conjunto pequeno, por índice).
- **Estágio 2:** mesmo SQL de scores, mesmo limiar e o mesmo `rankSearch`.
- **Exatidão:** só é exata se `s_K` (a similaridade do K-ésimo vizinho) for menor que `0,35/0,6 = 0,583`. Com K fixo, `s_K` pode ficar acima disso, e então os elegíveis só-semânticos entre 0,583 e `s_K` são perdidos.
  - **Medido:** D com K=500 em 100k perdeu 189 linhas na consulta sem termo em comum (recall 0,726).
  - A versão exata exige **K adaptativo**: crescer até `s_K < 0,583`, ou seja, uma consulta de raio. **Não foi medida.**
- **Patrocinado:** preservado por construção (ramo pago). Medido `sponsoredOk=true`.
- **Custo medido em 100k, com K=1000 e GIN:** 107 ms de mediana contra 205 ms da baseline. Com K=1000 o planner **não usou o HNSW**, então o ganho veio do GIN e da redução de linhas, não do índice vetorial.
- **Veredito:** é a única que preserva o comportamento. O ganho medido (cerca de 2x) é pequeno diante do custo (GIN novo, SQL complexo, K adaptativo ainda não validado).

## 5. Benchmark

Reprodução:

```bash
BENCH_DATABASE_URL=postgresql://bench:bench@127.0.0.1:5440/bench?schema=public npx tsx scripts/bench-search.ts 100000
```

- Banco descartável `bench`, com as migrations reais aplicadas.
- O script recusa qualquer URL que não contenha `/bench`.

Dados sintéticos:

- 200 temas com centróides hierárquicos e um componente global, para simular similaridade de base entre documentos.
- Distribuição de temas enviesada.
- 3 tenants (90%, 9% e 1%).
- 20% dos nichos com `requiresAge`.
- 10% de rascunhos, 2% de embeddings nulos (`PENDING`) e 0,3% de keyword stuffing.
- Promoções SEARCH: ativas em 1 de cada 333 links, mais promoções expiradas.
- 12 consultas.

Configuração da medição:

- Mediana de 5 execuções, com `plan_cache_mode=force_custom_plan` para comparar trabalho de SQL. A penalidade do plano genérico está em 3.1.
- Postgres 16.15 e pgvector 0.8.x em Docker local.

| Estratégia | 10k: mediana t1 | 100k: mediana t1 | 100k: pior caso t1 | HNSW usado em 100k? |
|---|---|---|---|---|
| Baseline (`hybridSearchSql`) | 35 ms | 205 ms | 216 ms | Não (`Parallel Bitmap Heap Scan`) |
| A, K=100 | 14 ms | 3,1 ms | 4,6 ms | **Sim** |
| A, K=1000 | 20 ms | 105 ms | 138 ms | Não (`Parallel Seq Scan`) |
| A iterativa, K=5000 | 56 ms | 160 ms | 209 ms | Não |
| D sem GIN, K=1000 | 38 ms | 181 ms | 272 ms | Não |
| D com GIN, K=1000 | 21 ms | 107 ms | 195 ms | Não (o GIN é usado) |
| B, só o ramo textual com GIN | 2 ms | 10 ms | 41 ms | Não se aplica |

Tenant pequeno (t3, 1% dos links): a baseline leva 7 ms em 100k, porque o índice `links_tenantId_ownerId_status_idx` já resolve.

Custos de construção:

- Em 100k: HNSW em 14,7 s com `maintenance_work_mem=512MB`. Com 2 GB, o build paralelo estourou o `shm` de 1 GB do container. GIN em 0,76 s.
- Em 10k: HNSW em 2,1 s.

EXPLAIN (ANALYZE, BUFFERS) da baseline `t1-tema0` em 100k:

- 205,9 ms;
- `Parallel Bitmap Heap Scan on links` mais `Bitmap Index Scan on links_tenantId_ownerId_status_idx`;
- `Buffers: shared hit=334215`.

O plano completo de cada estratégia sai no JSON do script (`plan`).

**500k e 1M: não medidos.** A carga sintética de 100k levou 187 s, e 1M exigiria cerca de 6 GB e cerca de 30 minutos. A baseline cresce de forma aproximadamente linear (35 ms em 10k, 205 ms em 100k, já com workers paralelos). As projeções abaixo são **projeções, não medições**:

- 1M em plano custom: cerca de 2 s.
- 1M em plano genérico: cerca de 20 s.

## 6. Recall contra a baseline

Métricas por consulta:

- `eligibleRecall`: fração dos elegíveis da baseline que a estratégia devolve;
- `sponsoredIdentical`: lista e ordem idênticas;
- `organicTop10Recall`;
- `firstOrganicSame`;
- `orderIdentical`: resposta inteira idêntica.

| 100k (12 consultas) | Pior `eligibleRecall` | Perdidos (soma) | Pago idêntico | Pior top-10 | Ordem idêntica |
|---|---|---|---|---|---|
| A, K=100 | 0,020 | 9.872 | **não** | 0,1 | 2/12 |
| A, K=1000 | 0,250 | 5.223 | **não** | 0,2 | 8/12 |
| A iterativa, K=5000 | 0,888 | 23 (stuffing) | sim | 0,3 | 11/12 |
| D com GIN, K=500 | 0,726 | 189 (só-semântico) | sim | 1,0 | 11/12 |
| D com GIN, K=1000 | 1,000 | 0 | sim | 1,0 | 12/12 |
| D sem GIN, K=1000 | 1,000 | 0 | sim | 1,0 | 12/12 |

- Em 10k, a D com K de 500 ou mais deu 12/12 idênticas, e a A com K=1000 perdeu 1 linha de stuffing.
- O "1,000" da D com K=1000 em 100k **depende do dado sintético**: em todas as consultas, `s_K` caiu abaixo de 0,583, ou os elegíveis tinham termo em comum. Com embeddings reais isso não está provado (seção 4.D).

**Limitação de validade:** as similaridades reais do `text-embedding-3-large` em PT-BR (por exemplo, a similaridade de base entre links sem relação) não são conhecidas sem a `OPENAI_API_KEY`. Essa distribuição define quantos links passam do limiar e, portanto, o K necessário. Esse é o dado que falta.

## 7. Trade-offs

| | Preserva o comportamento | Ganho de latência (100k) | Custo novo | Risco |
|---|---|---|---|---|
| Correção do plano genérico (3.1), **aplicada** | **Sim, linhas e scores idênticos** | **cerca de 10x em regime estável** (cerca de 2.090 para 210 ms) | Nenhum | Baixo |
| A ou C | Não (perde elegíveis e pago) | Até 60x com K=100 | Decisão de produto (limite) | Alto: pago perdido |
| B | Não sozinha | Não se aplica | GIN | Médio |
| D com K fixo | Não garantido | cerca de 2x | GIN, SQL complexo | Médio: perda silenciosa se `s_K ≥ 0,583` |
| D com K adaptativo | Sim (teórico) | Desconhecido | GIN, laço adaptativo | Não medido |
| Paginação ou limite da resposta (produto) | Muda o contrato de forma explícita | Habilita A, C e D com K pequeno | Decisão de produto e versão de contrato | Baixo, se for decidido |

Custos ocultos em escala:

- A resposta sem limite (4 mil itens em 100k) custa banda, serialização e render no cliente, independentemente do SQL.
- O token de superfície assinado por item (`signSurface`) é custo de CPU proporcional aos elegíveis.

## 8. Recomendação técnica

Recomendação da Task 11, mantida como histórico. A decisão final está na seção 10.

**OPEN — ARCHITECTURE DECISION REQUIRED. Não implementar a troca de arquitetura agora.**

1. **Corrigir o plano genérico (3.1) primeiro.** Feito: aplicado com teste de regressão de 10 execuções na mesma conexão. O custo restante, cerca de 200 ms em 100k, é a varredura completa do tenant, que só muda com a decisão de arquitetura.
2. **Decisão de produto antes de qualquer índice:** a busca deve devolver todos os elegíveis, ou um limite com paginação (por exemplo, todos os patrocinados elegíveis mais os N primeiros orgânicos)? Sem isso, nenhuma alternativa indexada preserva o comportamento atual.
3. **Validar com embeddings reais** (depende da `OPENAI_API_KEY`):
   - a distribuição de similaridade;
   - quantos links passam de 0,583;
   - só então escolher K, ou K adaptativo.
4. Se o produto mantiver "todos os elegíveis", a D com K adaptativo, GIN com OR e ramo pago é a única candidata que preserva o comportamento. Implementar apenas depois de medir a versão adaptativa com dados reais e com testes de paridade contra a baseline.

Critérios para fechar o item da busca: arquitetura definida, benchmark reproduzível, índice efetivamente usado, limite de candidatos definido, recall aceitável, filtros preservados, ranking preservado, testes de regressão e decisão documentada. Até a Task 12 eles **não estavam atendidos**. A decisão da Task 13 está na seção 10.

## 10. Decisão (Task 13): resultado completo e exato, com limite declarado

### Contrato real levantado antes da decisão

- **API:** `GET /api/v1/search?q=` devolve `{ target, threshold, sponsored[], organic[] }`.
  - Item: `id`, `name`, `description`, `surfaceToken`, `textScore`, `semanticScore`, `relevanceScore`, `embeddingState`, `threshold`.
  - Sem paginação, cursor, limite ou contador.
  - Consulta igual a nicho público devolve `target` de faceta com listas vazias.
  - Sem `OPENAI_API_KEY` ou com o provedor fora: 503 `provider_error`, sem fallback.
- **Frontend (`frontend/src/app/busca/page.tsx`):** uma chamada, renderiza todos os itens. Sem "carregar mais", rolagem infinita, contador, ordenação ou filtro.
- **Consumidores:**
  - `rankSearch`: `getSearch` e `autocompleteIds`, além dos testes.
  - `hybridSearchSql`: a rota e os scripts `bench-search.ts`, `bench-plan-cache.ts` e `explain-hot-paths.ts`.
  - `resolveSearchTarget`: só a rota.
- **Spec de produto (seção "Busca"):** define as regras de ranking e não define paginação. Home e Nicho paginam por cursor, mas isso é precedente de padrão, não decisão para a busca.

### Por que nenhuma opção entrega exato, sublinear e o contrato atual ao mesmo tempo

O conjunto orgânico se decompõe em duas partes:

1. **Links com algum termo da consulta** (`ts_rank > 0`). Podem ser pontuados de forma exata com GIN e OR dos termos. O custo é proporcional aos links que contêm os termos, e palavras comuns chegam perto do catálogo inteiro.
2. **Links sem termo em comum.** Para eles, `relevance = 0,6·semantic`. Ordenar por relevância é ordenar por vizinho mais próximo, e devolver todos os elegíveis é uma consulta de raio (`semantic ≥ 0,583`).

O HNSW é aproximado por construção: não garante todos os vizinhos de um raio, nem os K mais próximos. Uma busca semântica exata exige varredura (ou IVFFlat com todas as listas, que também é linear). Consequências:

- **Resultado completo:** exige a varredura. É a escolha feita.
- **Paginação:** só deixaria a primeira página sublinear aceitando aproximação na parte 2. O recall medido foi 1,0 no sintético, mas não pode ser comprovado com embeddings reais sem a `OPENAI_API_KEY`. Paginar mantendo a busca exata reduz payload e render, mas não o SQL.

### Decisão

`SEARCH ARCHITECTURE = ARCHITECTURE LIMITATION — FULL RESULT SET`

- A busca continua exata e completa. Nenhum K, HNSW como substituto, paginação ou GIN foram introduzidos.
- **Limite de escala:** custo linear nos links publicados do tenant. Medido: cerca de 40 ms em 10k e cerca de 210 ms em 100k, em regime estável depois da 3.1. Projetado, não medido: cerca de 2 s em 1M, mais o payload de milhares de itens e a chamada de embedding.
- **Gatilho para reabrir:** tenant com mais de cerca de 100k links publicados, ou p95 da busca acima do orçamento do produto. Nesse ponto a decisão volta a ser paginação com semântica aproximada, que exige medição com embeddings reais.

### Mudança aplicada: desempate determinístico

- **Bug:** `rankSearch` ordena por `activatedAt` (pagos) e por relevância (orgânicos), sem desempate. O SQL não tem `ORDER BY`, então a ordem dos empates dependia do plano do Postgres.
- **Correção:** `getSearch` ordena os candidatos por `id` antes de `visibleForAge` e `rankSearch`. Como o `Array.prototype.sort` é estável (ES2019), empates saem por `id` crescente.
- **`rankSearch` não mudou** (assinatura e corpo intactos). O autocomplete não mudou.
- **Teste:** `search.spec.ts` ("desempata relevância e activatedAt iguais pelo id"). Falhou antes (`['z','y']`) e passa depois.

### Contratos

| Contrato | Estado |
|---|---|
| `GET /api/v1/search` (request e response) | Inalterado |
| `rankSearch`, `priceFor`, `assertCheckout`, `transition` | Inalterados |
| `hybridSearchSql()` | Só a correção da 3.1 (vetor calculado uma vez). Mesmos parâmetros e linhas |
| Ordem de itens empatados | Antes indefinida, agora `id` crescente. Continua dentro da regra "pagos por `activatedAt`, orgânicos por nota" |
| Autocomplete | Inalterado: `OPEN — FUTURE / LOW RISK` |

### Migrações

Nenhuma.

### Auditoria (Task 14, 2026-10-01)

- Código revisado: CTE, filtros, pesos, limiar, tenant e idade iguais. O SQL não tem `ORDER BY` por desenho (a ordem é do `rankSearch`). O sort por `id` só define o desempate.
- Equivalência: spec PG 2/2. `bench-plan-cache.ts` em 10k (seed novo): 288 = 288 linhas, 0 divergências. Antes 41–677 ms, depois 42–56 ms.
- HTTP: `search.spec.ts` com 8 testes (faceta, sem elegíveis, adulto, host sem tenant, empate em 4 permutações). O 503 está coberto pelo Playwright.
- Lacuna: o caminho real (HTTP → embedding → SQL) não tem teste automatizado. Depende da `OPENAI_API_KEY` ou de um ponto de injeção do embedding. **Fechada na Task 15** (ver abaixo).

### Prova de ponta a ponta (Task 15, 2026-10-01)

- A rota depende de `SearchComposition { embedding, candidates }`. Produção usa `OpenAiEmbeddingService` mais `sqlCandidateSource(prisma)`, com o mesmo `hybridSearchSql()`. Não há `NODE_ENV` no caminho da busca.
- `search-http.pg.spec.ts` cobre HTTP → `DeterministicTestEmbeddingService` (1536 dimensões, só em teste) → SQL real no PostgreSQL → `rankSearch` → JSON:
  - uma chamada de embedding por request;
  - patrocinados por `activatedAt`;
  - orgânicos por relevância, com empate por id;
  - outro tenant, rascunho e adulto sem idade ausentes;
  - 503 sem executar o SQL quando o provedor falha.
- Não prova a OpenAI real (disponibilidade, latência, qualidade): continua `BLOCKED_EXTERNAL`.
- Classificação: correção do plano genérico, busca exata e desempate estão em **PASS**. Escala está em **ARCHITECTURE LIMITATION**, não em PASS. Autocomplete está em **OPEN — FUTURE / LOW RISK**.

### Riscos ainda sem prova

- Distribuição real de similaridade do `text-embedding-3-large` em PT-BR: define quantos itens a resposta completa carrega e o K de uma futura paginação.
- 500k e 1M não foram medidos. Os números acima são projeção linear.
- Latência da chamada de embedding por busca: não medida sem a `OPENAI_API_KEY`. Provavelmente comparável ou maior que o SQL em 100k.
- Dívida de testes: `npm test` (specs `.redis`) e `test:pg` usam o mesmo banco da porta 5433 e não podem rodar em paralelo. O CI roda em sequência. Bancos isolados por suíte ainda não foram implementados.

## 9. Autocomplete (só registro)

- 21 ms em 100k (medição da Task 10), com `ILIKE '%q%'` em Seq Scan.
- Um índice trigram (`pg_trgm`) é possível no futuro.
- Risco baixo no volume atual. **Não foi adicionado.**
