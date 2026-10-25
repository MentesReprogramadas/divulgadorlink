# Superfícies das features — material Ondas

Data: 23/10/2026. Escopo deste agente: apresentação das features privadas, aquisição, favoritos/coleções e feedback. A aprovação do usuário é da preview Ondas; esta rodada ainda não recebeu inspeção de navegador e não declara paridade visual concluída.

## Inventário e divisão

O [CSV por arquivo](ondas-component-audit-features.csv) registra 275 arquivos TSX/CSS Module das features e 8 de feedback, incluindo o complemento de checkout/conta registrado na [extensão app](2026-10-23-ondas-app-material-audit.md). Há 43 diretórios de features; `ui-lab` existe, mas não contém apresentação. Uma linha adicional registra esse diretório vazio. Cada arquivo inclui responsável, causa, efeito, evidência estática, testes realmente executados e limite visual.

- Este agente: 209 arquivos inventariados, incluindo os preservados por conteúdo publicado, composição interna ou semântica de estado. Isso não significa 209 telas aprovadas. A toolbar foi transferida para este escopo na [correção P1](2026-10-23-ondas-profile-toolbar-fix.md).
- `ondas_profile_finish`: 6 arquivos de frame/sidebar/navegação da conta.
- `ondas_resource_visual_finish`: 30 arquivos de administração, moderação, revisão, publicação e anexos.
- Raiz: 21 arquivos de catálogo/home/detalhe e o registro do diretório vazio; 17 arquivos experimentais são referência da preview e permanecem sob responsabilidade da raiz.

O grafo local foi consultado antes das mudanças (7.508 nós); conclusões foram confirmadas no código. O grafo descreve a versão indexada anterior e não certifica esta migração. O inventário foi conferido novamente no diretório atual.

## Causas e implementação

O problema principal era concreto: componentes tinham apenas `background: var(--surface-raised)` e borda. Alterar tokens não montava a `LiquidLens` usada na preview. `EmptyState` e `ErrorState` também não possuíam a camada óptica. O frame ainda podia impor backgrounds por seletores locais; a correção desse CSS ficou com o agente responsável pelo frame.

No primeiro lote foram alterados 86 arquivos TSX e 41 CSS Modules, incluindo o novo host local `features/feature-glass.module.css`. Com os complementos app e toolbar, o acumulado de features/feedback é 90 TSX e 43 CSS Modules, com 162 locais JSX de Lens — não são 162 lentes simultâneas por página. Os 9 arquivos de rotas alterados estão registrados à parte. Containers mantêm grid, padding, bordas de estado e overflow próprios. O mixin só fornece posicionamento, isolamento, tint e elevação ao foco. O wrapper sticky da prévia tem regras próprias para preservar a posição.

O lote inclui cards, formulários apresentados como cards, convites, grupos, histórico, acesso de equipe, métricas, integrações, resultados de busca, importação, assinatura/administração de planos e carregamentos correspondentes. `BillingAdmin` está neste escopo. `UrlProposalQueue` herda o material de `UrlProposalCard`, feedback e skeletons. `ReportQueue` pertence à moderação e foi delegado ao outro agente.

Os ícones decorativos de seleção de acesso, digest, aquisição, convite permanente, criação de página e histórico de atendimento foram neutralizados. Estados textuais e avisos preservam as cores semânticas. Não foram alterados permissões, preços, quotas, requisições, destinos, analytics ou decisões do backend.

## Publicações e exceções concretas

- Páginas e blocos publicados preservam cores/fontes escolhidas pelo publicador. Molduras de aparelhos continuam representando um aparelho; a superfície privada ao redor recebe vidro.
- `MediaResults` recebe `surface="workspace"` apenas no painel. O modo padrão publicado mantém a paleta real; não há imposição do tema da plataforma à publicação.
- O QR mantém sua placa branca para leitura. O diálogo recebe material da primitiva compartilhada.
- Avisos de sessão de suporte, rascunho, alteração não publicada, erros e pendências continuam identificáveis. Eles não foram apagados para tornar todos os preenchimentos transparentes.
- Menus, selects, inputs, diálogos, datepicker, navegação, scrollbar e CSS global são responsabilidade dos componentes compartilhados. Este lote não duplicou esse trabalho com seletores globais.

## Verificação observada

| Verificação | Resultado |
| --- | --- |
| Unidade das features afetadas, um worker | 79 arquivos, 271 testes passaram |
| Complementos: assinatura, editor, métricas, integrações, permissões, coleção e mídia kit | 13 arquivos, 52 testes passaram; subconjunto reexecutado, não 52 testes novos |
| ESLint dos TSX alterados | 86 arquivos, saída 0 |
| Parse dos CSS Modules de features e feedback | 77 módulos, nenhum erro de sintaxe |

Resultados: `output/ondas-final-visual/feature-glass-unit-results.json`, `feature-glass-completion-unit-results.json`. Listas de alterações e auditoria: `feature-glass-changes.json`, `feature-glass-completion-changes.json`, `feature-glass-changed-tsx.json`, `feature-glass-candidates.json` e `feature-inventory-summary.json`, na mesma pasta. O CSV distingue teste direto do arquivo de suíte geral da feature; executar uma suíte não prova que todos os seus estados foram exercitados.

Nenhum build, servidor, processo de runtime, browser ou E2E foi iniciado por este agente nesta rodada. Typecheck/build, inspeção real mobile/desktop, teclado/foco, zoom, contraste, fallback e custo de composição permanecem na consolidação da raiz. As capturas das versões anteriores não aprovam o material implementado aqui.

Reversão: remover as importações/instâncias decorativas registradas nos índices, as composições locais e o host CSS novo; no mídia kit, remover a variante apenas do painel. Não reverter o workspace inteiro: há mudanças de outros agentes e trabalho anterior do usuário.
