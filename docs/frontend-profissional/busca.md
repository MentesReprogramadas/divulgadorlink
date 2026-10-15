# Busca: hierarquia e interação

Atualização de 15/10/2026, conforme pedido de separar sugestões e tornar a navegação evidente. Escopo visual: autocomplete da home/busca e apresentação da página de resultados, sem alterar ranking, elegibilidade ou contratos da API.

## Decisões

- Separar o destino de exploração (nicho/rede) dos links sugeridos por cabeçalhos e grupos nomeados. Referência de interação: [W3C APG — Listbox](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/) e sua organização por grupos; [Atlassian Select](https://atlassian.design/components/select/code/) como referência complementar de agrupamento, sem adoção da biblioteca.
- Dar a cada sugestão uma linha inteira clicável, divisória, título forte e seta. Hover, seleção por teclado e foco tornam a ação perceptível sem depender só da cor.
- Exibir nicho e rede como metadados secundários abaixo do título, em badges compactos e não interativos. Não criar destinos concorrentes dentro da opção.
- Limitar a altura do painel com rolagem interna e manter o acesso a todos os resultados no rodapé. Setas/Enter/Escape seguem o [W3C APG — Combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/).
- Usar uma lista vertical de cards delimitados na página de resultados para preservar a leitura de título e descrição, em vez de quatro colunas densas. Separar patrocinados de links encontrados; destinos de nicho/rede têm ação explícita “Explorar”.
- Preservar URLs, surfaceToken, indicação de patrocínio e metadados de impressões. Respostas atrasadas de sugestões não substituem a consulta mais recente.

## Validação

Testes unitários cobrem agrupamento, metadados não interativos, destino rastreado, teclado e respostas fora de ordem. Verificação no Chromium local em 1440 px e 390 px inclui navegação real, ausência de overflow e axe WCAG A/AA. Dados demo não têm vetores para todos os 610 links; esta mudança não amplia a cobertura da busca semântica.
