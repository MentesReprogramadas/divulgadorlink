# Home de catálogo em largura total

Direção solicitada em 15/10/2026: remover publicidade das laterais, ampliar a área útil e colocar patrocinados imediatamente após Explorar. Não há alteração de quantidade de anúncios, ranking, preços ou contratos de rastreamento.

- Ordem visual e do DOM: proposta/busca → exploração por nicho/rede → patrocinados → orgânicos → paginação. A busca não disputa mais a largura com duas barras laterais.
- Largura fluida com margens internas de 16–48 px; o texto introdutório mantém limite de leitura. Grids ajustam a quantidade de colunas ao espaço, com base de 300 px por card, em vez de estreitar os cards para acomodar as laterais.
- Após revisão do usuário: proposta e campo de busca ficam centralizados; Explorar e a seção Patrocinados não têm fundo, borda ou caixa própria. O destaque fica nos cards patrocinados, com superfície turquesa muito suave e borda colorida. O marcador Patrocinado é pequeno e discreto, sem fundo, com ícone de diamante. A busca mantém largura máxima de 720 px, com sugestões alinhadas à esquerda.
- A revisão mais recente substitui os carrosséis da home por três colunas e duas linhas por grupo (até seis nichos e seis redes), com Ver mais/Ver menos preservando o acesso aos demais. Títulos de uma linha e descrição recolhida em duas linhas com expansão inline são mantidos.
- Explorar tem largura máxima de 1120 px e fica centralizado, com mais espaço reservado aos nomes de nichos e 32 px entre os grupos no desktop; no mobile os grupos se empilham com 16 px entre si. As três colunas têm largura pelo conteúdo: nomes não quebram nem são truncados. Em telas estreitas, há rolagem horizontal interna. O título e Ver mais também ficam centralizados, sem limitar a largura dos grids de anúncios e links.
- Referências documentais complementares: [Atlassian Grid](https://atlassian.design/foundations/grid), para alinhamentos responsivos; [Carbon 2x Grid](https://www.carbondesignsystem.com/building-blocks/foundations/2x-grid/overview) e [Spacing](https://www.carbondesignsystem.com/building-blocks/foundations/spacing/overview), para escala e agrupamento. O brief do usuário é o alvo de composição; não se replica o layout dessas referências nem se adota biblioteca externa.

Verificar desktop, tablet e mobile: ordem das seções, largura útil, colunas, ausência de overflow, teclado/busca, cards e badges, expansão inline, paginação, patrocínio e tokens de superfície. Dados demo são locais, sem checkout ou navegação externa.

## Carregamento incremental

Mostrar mais agora consulta o próximo cursor pelo BFF e acrescenta resultados ao catálogo atual, sem navegar ou substituir os cards anteriores. A primeira página continua renderizada no servidor, com metadados e JSON-LD mantidos na rota. O componente cliente da funcionalidade catálogo mantém os lotes seguintes, elimina IDs repetidos e preserva os surfaceTokens dos cards existentes. Anúncios continuam na seção patrocinada.

O botão bloqueia envios simultâneos; erros mantêm dados e cursor disponíveis para nova tentativa. Uma mensagem acessível anuncia a quantidade adicionada e o controle desaparece ao terminar o cursor.

Validação local: 9 testes afetados aprovados; Chromium em 1440 px e 390 px carregou dois novos lotes (15 → 39 → 63 orgânicos), preservando 9 patrocinados, sem navegação e sem alterar a posição da rolagem. Inclui falha HTTP, repetição do cursor, recuperação e axe A/AA. Na suíte completa, 120 testes passaram e 3 testes do formulário de envio falharam pela divergência preexistente entre o rótulo atual Titulo e a consulta Nome; essa área não foi alterada nesta correção.
