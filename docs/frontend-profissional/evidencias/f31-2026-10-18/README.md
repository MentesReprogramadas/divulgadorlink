# Evidências visuais F31 — 18/10/2026

12 capturas nativas do Playwright Test em geometry-final/f31-geometry-final, offset1460. Aplicação real Next → BFF → Fastify → PG/Redis; nenhum payload interno substituído para fingir sucesso. Interrupção de rede somente para estado de erro. Todas as imagens abaixo abertas e inspecionadas. Desktop1280×720, mobile390×844 emulado; capturas zoom em320×844/fonte200%. Sem alegação de aparelho físico/Safari/produção.

| Estado | Desktop | Mobile |
| --- | --- | --- |
| Relatório com amostra | [Captura](desktop-interaction-report.png) | [Captura](mobile-interaction-report.png) |
| Amostra insuficiente | [Captura](desktop-interaction-empty.png) | [Captura](mobile-interaction-empty.png) |
| Skeleton com geometria preservada | [Captura](desktop-interaction-pending.png) | [Captura](mobile-interaction-pending.png) |
| Falha de rede e retry | [Captura](desktop-interaction-error.png) | [Captura](mobile-interaction-error.png) |
| Página própria ausente; isolamento | [Captura](desktop-interaction-other-owner.png) | [Captura](mobile-interaction-other-owner.png) |
| 320px e zoom200% | [Captura](desktop-interaction-zoom.png) | [Captura](mobile-interaction-zoom.png) |

Axe A/AA, teclado/foco e overflow nos estados exercitados; comparação programática exata de largura/altura/Y do gráfico durante refresh. Fixture de dez sessões e oito links; impressões visíveis obedecem à permanência real. Não são baselines pixel-perfect de toda a plataforma. Labels/cores usam o design system existente. Histórico de erros corrigidos e pendência PG em [execução](../../../planejamento-features/execucao-f31.md).
