# Ondas: superfícies públicas (T3)

Estado em 23/10/2026: implementação disponível; validação visual e integrada pendentes. Não marcar T3 concluída apenas por este relatório.

## Implementação

- Home real mantém SSR, metadados e JSON-LD, busca/sugestões reais, facetas, filtros, paginação, patrocinados e favoritos. Hero central sem placa, título em uma linha e busca sem botão.
- LinkRow preserva link de card inteiro via pseudo-elemento, ações independentes e surfaceToken. Foto opcional acima do texto, sem texto sobreposto; omissão completa quando ausente ou ao falhar. Ícone opcional decorativo; fallback existente de facetas permanece.
- DTOs públicos consomem iconUrl/imageUrl/imageAlt aprovados pelo backend. Endpoint /api/ vira /bff/ no renderizador; sem URL fictícia ou upload simulado. Propagação em home, paginação, busca, facetas, relacionados e detalhe.
- Detalhe mostra foto maior, ícone e descrição real na seção Sobre o link. AgeWall, trackedGoPath, impressão e SEO permanecem nas fronteiras existentes.
- Login/cadastro/recuperação e artigos legais usam CSS Modules locais; aquisição recebe superfície coerente sem mudar texto, regras, consentimento ou CTAs.
- Sem dependências, commits, branches, worktrees, deploy, styles/*.css ou páginas personalizadas /p.

## Verificações executadas

- Vitest: 38 testes em 10 arquivos passaram. Inclui omissão/falha da foto, favorito independente, mídia aprovada na paginação e surfaceToken, mais testes existentes de catálogo/facetas/relacionados/discovery/login/cadastro.
- ESLint nos TSX públicos alterados, features/catalog e acquisition: passou.
- tsc --noEmit: passou; tsc --noEmit -p e2e/tsconfig.json: passou.
- Impeccable detect dos novos materiais e alvos públicos: [] (sem achados mecânicos). Não substitui inspeção visual.
- Grafo existente consultado para consumidores públicos e confirmado no código; atualização incremental fica com integração central.

## Cobertura por rota e pendências

| Rotas | Implementação | Inspeção real/E2E |
| --- | --- | --- |
| / | Hero, busca real, facetas e cards | Pendente |
| /busca | Busca/sugestões e DTO de mídia | Pendente |
| /nicho/[slug], /rede/[slug] | FacetCatalog e cards reais | Pendente |
| /link/[id] | Mídia, Sobre o link e ações reais | Pendente |
| /login, /cadastro | Superfície local, lógica preservada | Pendente |
| /esqueci-senha, /recuperar-senha | Superfície local, lógica preservada | Pendente |
| /divulgar | Material local da landing | Pendente |
| /termos, /privacidade | LegalArticle local | Pendente |

Build e E2E devem rodar centralmente e em série; nenhum runner E2E foi iniciado por este agente. Pendentes desktop/mobile, 320px/zoom200%, teclado/foco, busca aberta e Select, estados de erro/vazio/texto longo, contraste, reduced-motion/fallback e ciclo real de mídia. Conflitos legados em styles/catalog.css e discovery.css (navy literal em texto e estilos do campo) foram comunicados ao dono T1; confirmar após integração. Autenticação global de verificação é T1; nenhum gate foi alterado.

## Arquivos

- `frontend/src/app/home.module.css`
- `frontend/src/app/busca/page.tsx`
- `frontend/src/app/busca/search-results.module.css`
- `frontend/src/app/link/[id]/page.tsx`
- `frontend/src/app/login/page.tsx`
- `frontend/src/app/cadastro/page.tsx`
- `frontend/src/app/esqueci-senha/page.tsx`
- `frontend/src/app/recuperar-senha/page.tsx`
- `frontend/src/components/domain/catalog-image.tsx`
- `frontend/src/components/domain/link-row.tsx`
- `frontend/src/components/domain/link-row.module.css`
- `frontend/src/components/domain/link-row.test.tsx`
- `frontend/src/components/domain/card-description.module.css`
- `frontend/src/components/domain/search-box.tsx`
- `frontend/src/components/domain/search-box.module.css`
- `frontend/src/components/domain/facet-catalog.tsx`
- `frontend/src/components/domain/facet-filters.tsx`
- `frontend/src/components/domain/home-explore.module.css`
- `frontend/src/components/domain/legal-article.tsx`
- `frontend/src/components/domain/legal-article.module.css`
- `frontend/src/components/forms/public-account.module.css`
- `frontend/src/features/acquisition/components/advertise-landing.module.css`
- `frontend/src/features/catalog/server/home-page.tsx`
- `frontend/src/features/catalog/related-contract.ts`
- `frontend/src/features/catalog/components/home-catalog.tsx`
- `frontend/src/features/catalog/components/home-catalog.test.tsx`
- `frontend/src/features/catalog/components/catalog-skeleton.tsx`
- `frontend/src/features/catalog/components/link-detail.module.css`
- `frontend/src/features/catalog/components/related-links.tsx`
- `frontend/src/features/catalog/components/related-links.module.css`

## Reversão e limites

Reverter somente os trechos deste lote nos arquivos listados, preservando trabalho anterior e simultâneo. Novos arquivos: catalog-image.tsx, public-account.module.css, legal-article.module.css e este relatório. Sem migração de dados nesta fatia. A aprovação de mídia é responsabilidade do DTO/backend T2; interface não concede permissão nem publica mídia pendente.


## Ajuste do detalhe após revisão

- Em telas maiores que 850px, foto real à esquerda e resumo de vidro à direita. Hero de até 1280px; região nomeada do resumo de até 720px e relacionados na largura disponível permanecem.
- Abaixo desse limite, empilha. Sem foto (inclusive depois de erro de carregamento), CSS :has não cria a segunda coluna; resumo centralizado sem região vazia. Navegadores sem :has mantêm composição empilhada legível.
- Somente app/link/[id]/page.tsx e features/catalog/components/link-detail.module.css alterados nesta revisão; nenhum arquivo novo. Dados, AgeWall, surfaceToken, SSR, região nomeada e descrição completa preservados.
- Reexecutados 13 testes existentes de link-row/relacionados: passaram. ESLint do detalhe/renderizador: passou. Sem nova lógica; comportamento de falha de CatalogImage já coberto.
- Inspeção do runtime atualizado continua pendente do build central; porta 3100 ainda executava build anterior durante o ajuste.
