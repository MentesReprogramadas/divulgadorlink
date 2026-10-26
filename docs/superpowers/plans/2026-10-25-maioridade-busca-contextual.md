# Maioridade e busca contextual — plano de implementação

> **For agentic workers:** executar sequencialmente com Superpowers/executing-plans; não delegar nem criar outra branch. O pedido atual autoriza implementação, commit/push na main e publicação após validação.

**Goal:** oferecer confirmação de maioridade nas listagens com conteúdo restrito e encontrar categorias e links pelo contexto da consulta.

**Architecture:** manter o filtro de idade no backend e o diálogo existente no frontend. Consultar apenas a existência de links restritos elegíveis nas telas de faceta. Reutilizar os repositórios, o ranking e os embeddings existentes; acrescentar sinônimos locais, correspondência de facetas e sugestões de categorias derivadas de resultados públicos. Consultas diretas de facetas/temas usam evidência textual sem chamada externa.

**Tech Stack:** Fastify, PostgreSQL/pgvector, Next 15/React 19, Vitest e Playwright existentes.

**Spec:** pedido do usuário nesta conversa: abrir Telegram deve oferecer maioridade quando houver links +18, incluí-los após aceite e buscar links/categorias por contexto, inclusive termos equivalentes a Adulto.

## Restrições

- Não entregar títulos, descrições, imagens, URLs ou tokens de links +18 antes de `age=yes`.
- Recusa mantém conteúdo livre na listagem; preservar a restrição dos destinos inteiramente +18.
- Preservar tenant, publicação, suspensão, filtros de cidade/idioma/formato, patrocínio, limiar de relevância, analytics, SEO e paginação.
- Nenhuma dependência, migração, provedor ou infraestrutura nova. Sem envs de produção em testes.
- Preservar arquivos concorrentes, incluindo a pesquisa e os planos de catálogo de produtos já presentes.

## Revisão de limites

1. Link +18 fora do filtro atual não pode provocar confirmação desnecessária.
2. Rede +18 também restringe links de nichos livres, inclusive na home e no SQL compartilhado.
3. Acentos e palavras completas: `pornô` corresponde ao tema adulto; substrings acidentais não.
4. Consulta com tema e rede combina os dois contextos; não amplia para qualquer link da rede.
5. Categorias privadas, conteúdo de outro tenant e links não publicados não entram nas sugestões.

## Tarefa 1 — listagens e maioridade

Arquivos: `backend/src/http/catalog-query.ts`, `catalog-page.ts`, `controllers/@Catalog/routes.ts`, respectivos testes HTTP/PG e `frontend/src/components/domain/facet-catalog.tsx`.

- [x] Reproduzir em testes a ausência de `ageRequired` numa rede mista e a restrição por rede no SQL real.
- [x] Consultar existência de conteúdo restrito com os mesmos filtros, sem retornar seus dados; acrescentar a indicação à resposta mista.
- [x] Persistir a recusa e atualizar a listagem, mantendo disponíveis os resultados livres.
- [x] Verificar aceite, recusa, filtros, patrocínio, tenant e ausência de material restrito no HTML/JSON anterior ao aceite.

## Tarefa 2 — busca por contexto

Arquivos: `backend/src/use-cases/@Search/rank-links.ts`, `backend/src/http/controllers/@Search/routes.ts`, testes de domínio, HTTP e PostgreSQL.

- [x] Escrever testes vermelhos para sinônimos adultos e não adultos, consulta direta com links, tema+rede e confirmação antes da exposição.
- [x] Expandir a sondagem de facetas por sinônimos locais normalizados e delimitados por palavras.
- [x] Passar o contexto de nichos/redes à fonte de candidatos; admitir vetor ausente em consultas diretas, mantendo o limiar configurado.
- [x] Retornar categorias públicas correspondentes e categorias de resultados relevantes, preservando `target` e os tokens de superfície.
- [x] Aplicar os mesmos sinônimos no autocomplete sem chamar IA a cada tecla.
- [x] Validar SQL real, ausência de embeddings, indisponibilidade do provedor, limiar e isolamento de tenant.

## Tarefa 3 — apresentação e publicação

Arquivos: `frontend/src/app/busca/page.tsx`, `frontend/src/components/domain/search-box.tsx`, testes e E2E de catálogo/busca.

- [x] Mostrar múltiplas categorias/redes e links com componentes existentes, sem mudar a direção visual.
- [x] Executar regressões desktop/mobile, teclado, foco, zoom e estados de aceite/recusa; inspecionar no navegador isolado.
- [x] Executar lint, tipos, testes afetados e builds de ambos os pacotes; atualizar Graphify somente por extração local incremental.
- [ ] Registrar evidências e limites, revisar o diff e enviar somente os arquivos desta entrega à main.
- [ ] Acompanhar todos os gates de qualidade do SHA. Publicar API, worker e web no mesmo SHA pelo Coolify caso o CD continue sem credenciais no GitHub; confirmar versões, saúde e resultado público sem enviar dados reais.

Reversão: reverter os commits específicos desta entrega e republicar após os checks; não há migração de dados.
