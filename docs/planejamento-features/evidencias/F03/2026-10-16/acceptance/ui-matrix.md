# F03 — matriz de validação da interface

Ambiente local descartável, Chromium, Next em build de produção, API/BFF/PG reais. Desktop 1280×720 e mobile emulado 390×844. Revisão qualitativa das capturas; não há baseline anterior de pixels para a seção nova.

| Estado ou obrigação | Desktop | Mobile | Evidência |
| --- | --- | --- | --- |
| Primeiro lote no HTML e navegação para sugestão | Aprovado | Aprovado | E01, seis cards e impressão RELATED no banco |
| Saída por Acessar | Aprovado | Aprovado | E01, destino HTTP local real e CLICK RELATED |
| Nenhum candidato disponível | Aprovado | Aprovado | E01, seção ausente e origem preservada |
| Dados proibidos e outro tenant | Aprovado | Aprovado | E02, HTML/RSC/DOM e 404 do BFF |
| Aceite adulto e reload | Aprovado | Aprovado | E02, endpoint de idade real |
| Rede offline e recuperação | Aprovado | Aprovado | E03, cards preservados e novo lote sem duplicados |
| Teclado e fim da paginação | Aprovado | Aprovado | E03, Enter e foco na confirmação visível |
| Carregamento e bloqueio de envio repetido | Teste de componente aprovado | Mesmo componente | C01 com Promise pendente; não alegar inspeção separada de spinner no aparelho |
| Erro inicial e resposta negada | Teste de componente aprovado | Mesmo componente | C02, recuperação e ausência de sentinela |
| Cursor desatualizado | C02 + PG03 aprovados | Mesmo componente | Atualização da primeira página; não há E2E exclusivo deste estado |
| 320px e texto raiz em 200% | Aprovado | Aprovado | E03 e inspeção Chrome, sem overflow horizontal |
| Hierarquia, cards, semântica e foco visível | Inspecionado | Inspecionado | Chrome DOM/estilos e capturas abertas |
| Contraste secundário sobre card branco | 5,43:1 | Mesmos tokens | rgb(92,107,127) sobre rgb(255,255,255) |
| Canonical e robots existentes | Preservados | Preservados | E02/E03 e inspeção Chrome |

Console Chrome sem warnings/erros na página inspecionada. Documento 200, impressão 200 e visita 204 observados na rede da aplicação. Tráfego de extensão de segurança do navegador não é evidência do produto e não foi arquivado.

Limites: sem aparelho físico, leitor de tela ou promessa de acessibilidade total. Atalhos de zoom do MCP não alteraram DPR/viewport; a prova efetiva é reflow com texto raiz em 200%. Fontes em pixels nos cards existentes não passam a escalar em rem por esta feature. Algumas capturas full-page podem mostrar o skip link deslocado e o banner fixo de cookies sobre o conteúdo; o foco final foi verificado pelo DOM na confirmação, e a inspeção Chrome também foi realizada após recusar cookies. Nenhuma região alterada foi mascarada.
