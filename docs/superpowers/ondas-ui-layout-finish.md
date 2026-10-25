# Ondas — revisão das primitivas e estrutura

Data: 2026-10-23. Escopo delegado: `components/ui`, `components/layout`, navegação e moldura da área de trabalho. Fontes congeladas para a validação integrada pela raiz; este relatório não declara aprovação visual de todas as telas.

## Diagnóstico e correção

| Antes | Depois |
| --- | --- |
| A lente pertencia ao mesmo elemento que rolava a lista; opções podiam sair da área pintada. | Select, DatePicker e menu lateral têm viewport de rolagem separado da lente fixa no contêiner. Opções longas quebram linha. |
| Aprovar/Rejeitar usavam tinta semântica no botão, mas a lente continuava usando o preenchimento primário ciano. | Variáveis semânticas chegam à própria lente e ao fallback. Texto e fundo passam a usar o mesmo estado. A lógica da moderação foi preservada. |
| O wrapper do Input mantinha margem inferior, enquanto o wrapper do Select tinha margem zerada na barra de filtros. | Barras e formulários compactos zeram a margem dos dois wrappers pelos atributos de controle existentes. |
| Abas que cabiam na barra desapareciam ao surgirem ações adicionais. | ResponsiveTabs preserva abas que cabem na largura inteira; as ações podem ocupar a próxima linha. Select continua sendo usado quando as próprias abas ultrapassam a barra. |
| Cabeçalho e rodapé ainda apresentavam uma borda óptica, mesmo sem borda CSS. | `LiquidLens edge="none"` mantém o fundo refrativo e omite o aro decorativo nessas superfícies. |
| Alguns controles e seções mantinham fundos opacos ou duplicavam a pintura da lente. | Voltar, upload, paginação, métricas, relatórios e seções usam o material compartilhado; regras antigas conflitantes foram consolidadas nas áreas sob responsabilidade deste lote. |

O material continua vindo de `frontend/src/components/ui/liquid-lens.tsx` e `liquid-optics.ts`, extraídos da preview aprovada. Não foi criado um segundo algoritmo. O guard para ausência de ResizeObserver permanece ativo. Preferências de movimento/transparência reduzidos e fallbacks permanecem no componente e nos tokens compartilhados.

## Inventário individual

[ondas-ui-layout-file-audit.csv](ondas-ui-layout-file-audit.csv) registra os 41 arquivos TSX de produção das pastas UI, layout e componentes da conta: revisão individual, alteração ou preservação, validação executada, limite visual e hash da fonte. Arquivos delegados ao outro agente estão identificados; o inventário não os declara implementados por este lote.

## Evidência executada

- Captura de referência aberta: `C:/Users/ferna/AppData/Local/Temp/codex-clipboard-32d2ab84-7b8e-4968-a3a4-3353ece43be8.png`.
- Novos regressores de ausência de aro e orçamento das abas observados falhando antes da correção e passando depois.
- Vitest focal: 14 arquivos, 47 testes aprovados, um worker. Incluiu Lens, ResponsiveTabs, Voltar, Button, Input, DatePicker, ColorPicker, FileUpload, Pagination, ReportView, Tabs, InteractionPolicy, SiteNavigation e SiteShell.
- ESLint focal: 15 arquivos TS/TSX aprovados.
- PostCSS: 28 folhas CSS analisadas sem erro de sintaxe.
- Depois do lote de testes, ajustes apenas de apresentação: cabeçalho interno do diálogo sem aro, remoção de regra CSS sem consumidor no ColorPicker e herança de raio na célula das métricas. A validação integrada deve usar a fonte final.

Não foram executados por este agente build, typecheck global, navegador ou E2E. A raiz coordena esses passos e a inspeção desktop/mobile do build final. Sem mudança de dependências, regras comerciais, autorização, preços ou contratos de transporte. Reversão: revisar o diff por arquivo e restaurar apenas os trechos deste lote, preservando o trabalho simultâneo dos demais agentes.

## Revisão final de fonte

Leitura dirigida das montagens atuais de LiquidLens, seus hosts e CSS de superfície/rolagem. O levantamento estrutural encontrou 301 montagens JSX explícitas na árvore de produção, incluindo previews; isso não representa 301 componentes independentes nem aprovação visual de todas as variantes.

Achados confirmados e encaminhados:

- Popup “Mais opções da página” sem limite de altura/scroll e sem Lens própria: correção delegada pela raiz ao agente da revisão visual. Também comunicado o custo de Lens nos oito botões da régua invisível; o agente removeu a óptica dessa régua enquanto preservou sua geometria.
- Tabs tinha a lente dentro do próprio scroll horizontal. Após autorização da raiz, a lente passou ao host fixo `listFrame`; BaseTabs.List preserva a semântica e a rolagem, com indicador e controles intactos.
- A faixa de consentimento usava `--glass-frost`, enquanto o material lê `--lens-frost`. Nome corrigido para aplicar os 8px previstos.

Validação posterior dessas duas correções: seis arquivos / 32 testes aprovados (Tabs, ResponsiveTabs, Consent, ContactHandling, ProfileEditor e FavoritesScreen), um worker; ESLint dos dois TSX aprovados; duas folhas CSS analisadas sem erro de sintaxe. O teste adicional de teclado cobre setas, Enter, aba desativada e aria-controls. Não foi escrito teste estrutural que apenas espelhe o novo wrapper.

Não surgiram outros defeitos concretos de fonte nesta revisão dirigida. Layout renderizado, contraste e performance real permanecem sujeitos à inspeção e aos checks integrados coordenados pela raiz.

No fechamento do inventário de CSS, foram adicionadas Lens aos hosts de WorkspaceFilters, FormSkeleton/DetailSkeleton e SearchContext de `/busca`, antes planos: quatro arquivos/oito testes, lint dos três TSX e sintaxe dos três CSS aprovados. O regressor W14 levou à regra final de largura descrita na tabela: três arquivos/dezesseis testes focais aprovados, preservando o caso estreito de 320px. Esses resultados não substituem o E2E executado pela raiz.

Diagnóstico posterior de W09 confirmou no navegador largura residual de barras/eixos Recharts após resize, em vez de régua ou tooltip. A viewport `.chart` contém esse desenho com `overflow:clip` local até a atualização do ResizeObserver; foco SVG permanece interno e tooltip mantém quebra de texto e limite de largura. Evidência de falha: `output/ondas-demo/width-diagnostic.log`. Não foi alterada a expectativa nem o prazo do E2E; o reteste real é coordenado pela raiz.

Após essa correção: quatro arquivos/sete testes focais aprovados, incluindo consulta do gráfico real pelo teclado e anúncio completo do rótulo/valor; lint dos dois TSX e sintaxe CSS aprovados. Sem declaração de E2E aprovado neste relatório antes do reteste da raiz.
