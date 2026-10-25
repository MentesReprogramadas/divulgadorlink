# Detalhe público — paridade com Ondas

Implementação em 23/10/2026, branch existente `codex/roadmap-f37-testes`. Referência examinada: `WaveLinkDetail`, CSS compartilhado extraído pela raiz e captura `output/ondas-resources-visual/ondas-preview-detail-1440.png`.

| Antes | Agora na fonte | Motivo |
| --- | --- | --- |
| Resumo central com painel azul e imagem esticando a coluna. | Classes exatas `detailHero/detailMedia/detailCover/detailSummary` da preview, com `LiquidLens` compartilhado. | Usar a mesma hierarquia e material aprovado; CSS comum controla proporção 1.2/1 e alinhamento inicial. |
| H1 com classe de título turquesa e ações pequenas. | H1 herda texto claro; acesso ocupa a largura restante, favorito usa variante vítrea. | Preservar o desenho aprovado no conteúdo real. |
| Descrição completa isolada, sem informação lateral. | Introdução derivada da primeira frase, seção Sobre com texto completo, sidebar Detalhes com fatos existentes. | Dar contexto sem inventar tipo, localização, idioma, highlights ou números. |
| Relacionados com cabeçalho antigo. | A descoberta continua e retorno ao catálogo, usando grid/card comuns. | Reutilizar a composição da preview sem importar seus mocks. |

Arquivos da fatia: `app/link/[id]/page.tsx`; `features/catalog/components/link-detail.tsx`, `link-detail.module.css`, `link-detail.test.tsx`, `copy-link-button.tsx`, `copy-link-button.test.tsx`, `related-links.tsx`, `related-links.module.css`, `related-links.test.tsx`. A raiz também autorizou a extensão compatível em `components/domain/catalog-image.tsx` e seu novo teste específico: fallback opcional `ReactNode`, mantendo `null` para os callers existentes. O avatar do detalhe usa iniciais derivadas da primeira/última palavra do nome real quando o ícone está ausente ou falha; a capa conserva omissão sem fallback visual inventado.

A página mantém loader SSR com cache, `generateMetadata`, canonical/robots/JSON-LD, indisponibilidade, `AgeWall`, impressão e `trackedGoPath` com prioridade de token/queryId. A cópia usa canonical público ou `/link/id`, sem propagar referências de busca/superfície. A denúncia continua em `/painel/denunciar/id` e agora é revelada pelo disclosure Encontrou um problema. O teste E2E de denúncia precisa abrir esse disclosure antes de clicar; a raiz foi informada.

O DTO público não fornece tipo Comunidade/Canal, contagem de visualizações ou elegibilidade de destaque no detalhe. Esses fatos não foram inventados. Só dados reais de rede, nicho, cidade, idioma e participação são apresentados. Sobre é omitido se a descrição estiver ausente/igual ao nome; a mídia também pode ser omitida/falhar sem manter o espaço, conforme os seletores compartilhados adicionados pela raiz.

Verificações próprias: RED observado para introdução/sidebar, cópia/erro recuperável, cabeçalho de relacionados e fallback de ícone. Depois, **6 arquivos/25 testes passaram** em 2,12 s, cobrindo detalhe/cópia/relacionados/imagem e contratos de saída/crawlers encontrados no pacote. ESLint dos arquivos TSX da fatia passou antes apenas da última derivação de iniciais; TypeScript geral `--noEmit --incremental false` passou antes da extensão final do fallback. A raiz coordena lint/tipos/Vitest/build globais após o congelamento do código desta fatia. Nenhuma dependência, lockfile, regra de negócio, transporte, dado ou backend foi alterado por esta fatia.

Não executei build, E2E, servidor ou inspeção nova de navegador: a paridade visual após estas mudanças ainda exige comparação real desktop/mobile coordenada pela raiz. O CSS compartilhado, shell, ícones, FavoriteButton e LiquidLens foram integrados pelos outros responsáveis; não pertencem ao diff desta fatia. Para reversão, retornar somente os arquivos listados e a composição do detalhe, preservando as mudanças anteriores da árvore.
