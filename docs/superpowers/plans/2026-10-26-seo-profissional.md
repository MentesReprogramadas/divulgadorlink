# SEO profissional — plano de implementação

> Execução autorizada explicitamente em 26/10/2026. Aplicar Superpowers, TDD e verificação; sem nova pausa entre lotes. Preferências do usuário prevalecem sobre sugestões de commits/worktrees das skills.

**Goal:** implementar SEO editorial, rastreável e seguro para redes, nichos, coleções e detalhes, priorizando adulto e apostas.
**Architecture:** política pura e textos no domínio; configuração editorial por tenant reutilizando Config com revisão concorrente; projeção pública distinta do conteúdo restrito. Catálogo e sitemap compartilham elegibilidade; frontend apenas apresenta contratos.
**Tech Stack:** Fastify, Prisma/PostgreSQL, Next 15/React 19, Vitest e Playwright existentes.
**Spec:** `docs/superpowers/specs/2026-10-26-seo-profissional-design.md`; pesquisa em `docs/pesquisas/2026-10-26-pesquisa-palavras-chave-redes-nichos.md`.

## Restrições e decisões de execução

- Trabalhar na árvore atual, preservando mudanças preexistentes. Sem novas dependências, branch ou worktree. O pedido posterior “quando finalizar suba para prod” autoriza commit/push da entrega isolada e deploy após validação.
- Não promover serviços sexuais pagos, conteúdo íntimo sem consentimento ou material não aprovado. Cobertura editorial não concede permissão.
- Links adultos só indexam prévia aprovada ligada ao conteúdo atual; nunca mídia/convite restrito em HTML/RSC anônimo. Apostas não recebem classificação sexual por idade.
- Usar um documento Config versionado por tenant para editorial; revisão atômica evita perda de edição concorrente. Sem migration nova neste escopo.
- Reutilizar consultas, ranking e surfaceToken; cursor continua associado a tenant/idade/filtros. Não alterar prioridade comercial.
- As coleções são cadastráveis por intenção, com filtros explícitos de rede/nicho. Não gerar combinações automaticamente nem inferir assunto por palavra do anúncio.
- Interface pública: `seo.rating?: 'adult'`, `breadcrumbs`, `nextCursor`; detalhe restrito: prévia pública + `ageRequired/blocked`, dados completos somente após cookie de idade confirmado no servidor.

## Revisão: entradas que exigem atenção

Tenant divergente; administrador banido; duas gravações da mesma revisão; prévia desatualizada após edição/mídia; cache e payload de adulto sem cookie; paginação atravessando idade; coleção vazia/privada; campos editoriais com HTML; filtros arbitrários; testes antigos que afirmam indexação de páginas vazias.

## Tarefas

- [x] 1. Política e editorial backend: catálogo de termos das 20 redes/25 nichos, previews com fingerprint, configuração versionada, endpoints admin seguros e testes RED→GREEN.
  Arquivos: novos `domain/catalog/seo-editorial.ts`, `repositories/catalog-seo.ts`, `http/controllers/@Admin/catalog-seo.ts`; registrar em rotas admin. Contrato em `docs/superpowers/seo-profissional-contract.md`.
- [x] 2. Integração backend: projeções de facetas/detalhes, inventário elegível, coleções por intenção e sitemap coerente, preservando idade/tenant/ranking. Atualizar testes existentes cujo contrato foi explicitamente substituído.
  Arquivos: Catalog/Links routes, sitemap-index, links-repository, testes HTTP/domínio/PG afetados.
- [x] 3. Frontend: metadados com rating, introduções e trilhas, páginas de coleções, paginação HTML, detalhe público/restrito, configuração editorial e revisão de prévias em administração; testes afetados.
  Arquivos: crawler-policy, home-page, facet-catalog, rotas de rede/nicho/link/divulgar, componentes admin e novas rotas de coleção.
- [x] 4. Validação: lint/typecheck/testes/build em ambos pacotes; PG/E2E das jornadas SEO/idade/admin; inspeção real desktop/mobile com evidências. Não encerrar processos alheios; usar runtime isolado existente.
- [x] 5. Revisão independente do diff, correções e revalidação necessária; atualização incremental local Graphify e relatório de entrega/limites/reversão.

Cada tarefa de comportamento começa por teste falhando e termina com checks reais. Não declarar o programa concluído se faltar tarefa. Resultado de ranking/Google Search Console permanece não comprovado sem publicação e dados do Google.

## Registro de execução

- Início: autorização de implementação recebida; Git contém trabalho concorrente de pesquisa de produtos, busca e correções de idade. Não atribuir esses diffs ao SEO.
- Ruling: usar configuração existente em vez de novos campos Prisma — menor mudança completa e sem tocar migration concorrente; custo: leitura/validação de um documento editorial por tenant.
- Validação local concluída: release isolado com 731 testes backend, 790 frontend, 19 PG, 14 E2E SEO, 4 regressões e 4 testes visuais (Windows/Linux desktop/mobile); lint, tipos e builds verdes. Revisão independente e correções verificadas.
- Publicação: autorizada; pendente acompanhar checks do commit da entrega e confirmar saúde em produção.
- Primeira CI: 19 checks passaram, três cenários falharam. Duas causas corrigidas (H1 sem quebra e timer anterior à falha de flush). Os três testes originais passaram depois em Linux; revisão independente e frontend completo novamente verdes, agora com 793 testes.
