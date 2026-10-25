# Ondas — consolidação documental

Data: 23/10/2026. Escopo: atualização documental da direção já aprovada e promovida pelo usuário à plataforma. Não houve nova entrevista, escolha de mundo, alteração de implementação, hooks ou dependências.

## Entrega

- `DESIGN.md`: substitui a extração clara anterior pelo material Ondas observado no código. Mantém as oito seções canônicas, tokens reais e a distinção entre composição da home, densidade das ferramentas e publicações personalizadas.
- `.impeccable/design.json`: schemaVersion 2, 28 metadados de cor e rampas documentais, cinco papéis tipográficos, sombras/movimento/breakpoints observados e dez amostras HTML/CSS independentes. As amostras de Select e diálogo são declaradamente visuais; não reproduzem portal, foco ou autorização do produto.
- `docs/superpowers/evidence/ondas-design-before.md`: cópia exata do DESIGN anterior à substituição, criada antes da edição e sem sobrescrever backup existente.
- `PRODUCT.md` e `.impeccable/surfaces/home-directions.md`: ajuste pontual do contrato. Registram o pedido posterior de 23/10 que promove Ondas ao frontend real; outras alternativas continuam experimentais, enquanto anexo de ícone/capa é agora implementação opcional e moderada com vínculo próprio ao Link/tenant.

## Fontes lidas

Código: `frontend/src/styles/{primitives,tokens,foundations,components,catalog,discovery,workspace}.css`; `app/home.module.css`; `components/layout/{site-shell,ondas-atmosphere,wave-canvas,sidebar-link}`; primitivas Button/Input/Select/DatePicker/OverlayDialog; `components/domain/link-row.module.css`; `features/catalog/{server/home-page.tsx,components/link-detail.module.css}`; `features/account/components/workspace.module.css`; escopo de tokens em `features/profiles/components/personal-page.module.css`.

Contratos e evidências: spec e plano `2026-10-23-ondas-platform`; `ondas-t1-t3-t4-review.md`, `ondas-media-review.md`, `ondas-route-validation.md`; PRODUCT e brief existentes. A aprovação explícita do usuário e AGENTS superam as pausas de confirmação sugeridas pelo playbook Document. A atualização não deriva de escolha autônoma da documentação.

## Conferências executadas

Uma conferência local breve, sem runner de aplicação: YAML lido com `js-yaml` já instalado, JSON parseado, oito headings canônicos em ordem, todas as 28 cores comparadas com os tokens CSS resolvidos, referências dos componentes e propriedades permitidas conferidas, dez snippets CSS parseados com PostCSS instalado, narrativa do sidecar igual ao Overview e ausência de caractere de substituição nos quatro documentos ativos. Resultado: passou. Não foram instaladas bibliotecas para isso.

Os tokens de alpha foram preservados; as rampas OKLCH do sidecar representam amostras opacas calculadas a partir da cor de origem. Não são novos degraus de produto nem prova de contraste. O navy continua pigmento literal, separado do papel `color-link`. Nenhum preço, permissão, conteúdo comercial ou paleta de proprietário foi redefinido.

## Limites e reversão

Este agente não executou navegador, screenshots, lint, typecheck, testes de aplicação, build, banco ou E2E. Não abriu capturas antigas como prova de fonte atual nem afirmou validar as 95 rotas. Os relatórios lidos registram revisão estática e navegação com limites; correções posteriores continuam dependendo da validação central.

A documentação descreve o código lido nesta etapa e não encerra T5/T6. Ajustes posteriores de material, pausa, shader ou componentes exigem sincronizar os valores afetados. Para reverter este lote, restaurar DESIGN a partir do backup e reconciliar sidecar/PRODUCT/brief com o estado de implementação escolhido, sem apagar alterações da árvore compartilhada. Nenhum commit, branch, push ou deploy foi realizado.
