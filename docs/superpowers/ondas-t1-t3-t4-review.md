# Ondas — revisão independente T1/T3/T4

Revisão em 23/10/2026 do código e dos contratos de apresentação. Fonte de escopo: `specs/2026-10-23-ondas-platform-design.md`, `plans/2026-10-23-ondas-platform.md`, relatórios público/workspace e baseline próprio `output/ondas-t4/baseline.json`. A árvore compartilhada já continha alterações anteriores; esta revisão não atribui todas elas à migração.

## Resultado

Seis achados materiais identificados e resolvidos no código após correção pelo agente principal. Reinspeção limitada aos achados, sem nova busca abrangente.

| Achado | Local | Correção confirmada |
| --- | --- | --- |
| Texto claro sobre branco no checkout e editor de planos | `frontend/src/styles/promotions.css:24` | Cards de duração, plano e método usam `--surface-glass`; controles usam `--action-primary-bg`. |
| Texto branco sobre sucesso/erro claros na moderação | `frontend/src/styles/operations.css:207` | Aprovar/rejeitar usam pares semânticos de fundo/texto; hover mantém fundo compatível. |
| Número da etapa ativa branco sobre turquesa | `frontend/src/components/ui/form-steps.module.css:9` | Usa `--color-primary-ink`. |
| Hover pastel sob texto claro em ações e logout | `frontend/src/styles/components.css:151`, linha 158; `frontend/src/features/account/components/logout-button.module.css:3` | Hover usa fundos semânticos de status. Correções relacionadas de abrir/editar também verificadas. |
| Logo navy sobre drawer escuro | `frontend/src/components/ui/overlay-dialog.tsx:47` | Sidebar usa `/brand/ondas-logo.svg`; tratamento próprio do perfil personalizado preservado. |
| Espaçamento sem token definido | `frontend/src/features/catalog/components/link-detail.module.css:2`; `frontend/src/components/domain/home-explore.module.css:1` | `--space-5` substituído por `--space-6`. |

Na identificação inicial, os pares explícitos de cores foram calculados localmente: checkout 1,16:1; etapa ativa 1,31:1; aprovar/rejeitar 1,36:1 e 1,65:1; hover das ações/logout entre 1,13:1 e 1,39:1. Esses valores descrevem os defeitos anteriores, não medições finais em navegador.

## Contratos examinados

No recorte lido, continuam presentes SSR/SEO, `surfaceToken`, navegação independente do favorito, omissão completa de imagem ausente ou com erro, estados de patrocinado e personalização local de `ProfileView`. A atmosfera permanece decorativa, separada dos dados do catálogo, com pausa, reduced-motion e fallback de renderização. Grafo existente consultado para SiteShell, WaveCanvas, LinkRow e ProfileView; conclusões confirmadas no código atual. Índice não foi atualizado por esta revisão.

## Limites

Não houve edição de implementação por este revisor; somente este relatório. Não foram executados navegador, screenshots, testes, build ou revisão do fluxo T2 ainda em implementação. Resultados de testes comunicados pelo agente principal não foram repetidos nem tratados como execução deste revisor.

Os seis achados estão resolvidos por inspeção de fonte. Isso não aprova visualmente as 95 rotas, contraste composto das superfícies, mobile/zoom, foco/teclado ou a jornada integrada de mídia; essas verificações continuam no fechamento central T5/T6. Sem commit, push, deploy ou alteração de dados.
