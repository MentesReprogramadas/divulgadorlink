# Resultado do destaque — cards, abas e paginação

18/10/2026. Escopo: `/painel/links/[id]/resultado`.

## Decisões

- Impressões, cliques e CTR ocupam a primeira linha de cards; investimento e CPC formam a segunda. Comparação anterior permanece junto do respectivo valor.
- Abas Tabela/Gráficos usam a primitiva existente do painel. Detalhamento mantém seções diárias e por superfície. Sete dias por página, com intervalo, página atual e Anterior/Próxima; nenhum pedido adicional à API para paginar.
- Gráficos de barras sem dependências novas. Alternância entre cliques e impressões, escala fixa para todo o período em cada métrica e valores textuais. Dias indisponíveis usam faixa e rótulo, nunca uma barra de zero.
- Explicações de cálculo recolhidas; avisos de cobertura, retenção, CPC e histórico de investimento permanecem visíveis.
- Voltar, atualizar, filtrar e paginação reutilizam ícones para os mesmos significados existentes. Não foram introduzidos novos desenhos ou significados, nem alterado o contrato compartilhado de ícones.

Referências internas: `features/profiles/components/profile-overview.module.css` (cards, tokens e densidade), `components/layout/workspace-controls.tsx` (ações/filtros responsivos), `components/ui/tabs.tsx` (abas/teclado). [Carbon Data Table](https://www.carbondesignsystem.com/building-blocks/core/components/data-table/guidelines) fundamenta a separação de cabeçalho, tabela e paginação inferior. Refero não está disponível nas ferramentas desta sessão. A documentação externa complementa os padrões existentes; nenhuma biblioteca externa foi incorporada.

## Verificação

- Vitest: 10 testes aprovados nos arquivos de relatório e ícones/navegação. Cobrem paginação com última página incompleta, alternância de visualização/métrica, ausência de histórico, comparação, erros, filtros e acesso negado.
- `npm run lint` e `npm run typecheck`: aprovados.
- Build e E2E final: resultado registrado após conclusão abaixo.

A suíte usa PostgreSQL/Redis e serviços próprios, `E2E_PORT_OFFSET=200` e `E2E_RUN_ID=performance-cards`: web 3200, API 3533, stub 4299, externo 4643, PostgreSQL 5633 e Redis 6580. Não interrompe os processos existentes de localhost:3000/3333. O setup executa `npm run build` com `TEMLINK_E2E_BUILD=1`, usando `.next-e2e` separado do desenvolvimento.

Correções durante validação: descrições dos cards movidas para dentro de `dd`, corrigindo a estrutura de `dl`; remoção de borda duplicada no contêiner de filtros. O teste aguarda a animação real de entrada da aba terminar antes de medir contraste (uma medição durante a opacidade transitória gerava um falso resultado de contraste). A requisição usada para criar a fixture de paginação é feita pelo navegador, que resolve os hosts `.localhost`, sem depender do DNS do Node.

## Limites e preservação

A URL solicitada abriu a tela de login no navegador sem sessão. A validação autenticada usa conta e tenant de teste da suíte existente; não foram consultados dados privados do link indicado. Capturas usam fixtures: o teste de paginação expande a resposta diária para 15 dias e uma lacuna de histórico sem gravar esses eventos no banco; não serve para auditar agregações do backend. Capturas são inspeção visual manual, sem criação automática de baseline de regressão. Sem validação em aparelho físico ou produção e sem comparação de métricas de desempenho antes/depois.

Transporte, parâmetros GET, autorização, tenant, regras comerciais, atribuição e eventos permanecem nos contratos existentes. O relatório apresenta os valores recebidos e não recalcula preços ou elegibilidade. Dependências e lockfiles não foram alterados.

## Arquivos e reversão

Alterações limitadas a `features/promotions/performance-screen.tsx`, `components/performance-report.tsx`, `components/performance-report.module.css`, `components/performance-report.test.tsx`, novo `components/performance-details.tsx` (todos em `frontend/src/features/promotions`, respeitando os caminhos locais) e `frontend/e2e/promotion-performance.spec.ts`, além desta evidência. Para reverter, retirar apenas o diff desta fatia e o novo componente; preservar os demais arquivos locais já alterados pelo usuário. Nenhum commit, branch, push ou deploy foi realizado.

## Resultado final e capturas

Build de produção aprovado pelo setup E2E. Execução final: **9/9 E2E aprovados** (setup + quatro testes em desktop e os mesmos quatro em mobile), em 1,2 minuto. Inclui filtros/campanha, atualização, recuperação offline, acesso negado, sessão, 320 px, zoom de fonte a 200%, paginação de três páginas e limite final, abas com setas/Enter, alternância da métrica e ausência de overflow. Axe não apontou violações no `main` nas duas abas e nos dois viewports do teste final; isso não certifica acessibilidade total.

Capturas finais inspecionadas: desktop de 1440×900 e mobile emulado de 390×844, com página completa. Tabelas largas têm rolagem própria em mobile; a página não ganha rolagem horizontal. Textos secundários usam `--text-secondary` (#5c6b7f), conferidos após o fim das animações. Os avisos do build sobre raiz com múltiplos lockfiles, configuração ESLint, `align-items: start` em workspace-section e standalone já pertencem à infraestrutura existente e não impediram o build/testes.

- [Desktop — tabela](desktop-tabela.png)
- [Desktop — gráficos](desktop-graficos.png)
- [Mobile — tabela](mobile-tabela.png)
- [Mobile — gráficos](mobile-graficos.png)

O teardown removeu os containers e processos próprios da execução. O servidor de desenvolvimento original foi preservado.
