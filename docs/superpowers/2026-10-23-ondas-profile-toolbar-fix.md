# Popup de ferramentas da página — correção P1

23/10/2026. A revisão encontrou o popup da toolbar sem limite de altura e sem a lente da preview. Em viewport baixo, as oito ferramentas e ações de publicação podiam ultrapassar a área visível.

`profile-editor-toolbar.tsx` e seu CSS Module agora separam a lente, fixa no host, do corpo rolável. A altura disponível é medida acima/abaixo do acionador, considerando `visualViewport` quando existe; posição e margem lateral de 12px são recalculadas em abertura, scroll e resize. O corpo mantém padding para foco e permite rolagem interna. Summary, botões e links mantêm material óptico; apenas o corpo se move ao rolar.

Escape fecha e devolve foco ao summary. Ações mantêm callbacks, restrições e estado disabled. A régua de medidas continua inert e fora da ordem de foco, reutilizando os mesmos estilos e conteúdo do Button sem montar clientes ópticos invisíveis.

O teste novo falhou antes da implementação em 2 casos: ausência do corpo/posição limitada e montagem de lentes na régua. Após a correção, 15 testes passaram em 2 arquivos (3 da toolbar e 12 do editor). A rechecagem final inclui colisão lateral no viewport de 320px simulado, foco/Escape, execução de ação e link publicado. ESLint dos 2 TSX passou; parse do CSS Module passou.

Resultado: `output/ondas-final-visual/profile-toolbar-unit-results.json`. O [CSV de features](ondas-component-audit-features.csv) foi atualizado com responsabilidade e evidência próprias para estes dois arquivos.

Não foram executados browser, servidor, build ou E2E. JSDOM simula as medidas para testar o cálculo, mas não comprova renderização/rolagem real, contraste ou clipping. A raiz deve inspecionar o menu aberto em mobile/desktop e zoom antes de declarar esse estado visual aprovado.
