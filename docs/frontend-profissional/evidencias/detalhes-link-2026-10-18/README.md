# Detalhes e recomendados em largura total — 18/10/2026

## Resultado

Na rota `/link/[id]`, cidade/UF, idioma e participação aparecem quando preenchidos, usando os mesmos metadados e ícones dos cards da home. A API pública e os recomendados agora projetam esses campos existentes; não há alteração de schema nem dependências.

O conteúdo principal usa a mesma largura e os mesmos gutters responsivos da home. Título, descrição, metadados, acesso, favorito e denúncia ficam em uma composição centralizada, limitada a 720 px para leitura. Os recomendados permanecem fora desse limite e reutilizam a grade da home: quatro colunas em 1440 px quando há itens suficientes, uma coluna no mobile.

A página indicada pelo usuário foi inspecionada em Chromium local. Antes: `main` com 760 px e recomendados com 712 px. Depois, em viewport de 1440 px: conteúdo disponível com 1425 px e recomendados com 1353 px; os 15 px restantes correspondem ao gutter estável de rolagem. O detalhe ficou com 720 px e centralizado. Confirmada a presença de Franca / SP, português e Online na página original, sem alterar os dados do usuário.

A referência de composição foi a home real do produto, conforme pedido, mantendo sua grade, espaçamento, tokens, navegação e marca. CSS local em `link-detail.module.css`. Os desenhos de cidade, idioma e participação mantêm seus significados existentes.

## Validação executada

- Frontend: lint e typecheck no workspace final, e 15 testes afetados em 3 arquivos. O primeiro typecheck encontrou uma edição paralela incompleta no financeiro; a área não foi modificada por esta tarefa. Após esse trabalho avançar, o typecheck geral passou.
- Backend: lint, typecheck, build e 26 testes de catálogo/recomendados em 2 arquivos.
- HTTP/PostgreSQL: 15 testes em 2 arquivos, incluindo projeção dos dados no detalhe e nos recomendados, ausência em conteúdo indisponível, tenant, proprietário, idade, deduplicação e tokens de analytics.
- E2E: F03-E01/E02/E03 em desktop 1440×900 e mobile 390×844. Passaram acesso real ao stub, impressão/clique RELATED, omissão de seção vazia, isolamento, aceite de idade, paginação, offline/retry, foco por teclado, axe e reflow em 320 px/200%.
- O último cenário desktop foi repetido e passou após corrigir a medição do teste: a comparação usa a largura real do contêiner, descontando o gutter de rolagem do navegador. Não houve relaxamento de tolerâncias ou exclusões de axe.
- Build de produção Next concluído pelo setup da validação E2E isolada. A cópia foi baseada no snapshot anterior validado e recebeu os arquivos desta tarefa para preservar o trabalho paralelo do financeiro.
- Inspeção real da URL indicada com Chrome DevTools, além dos testes Playwright. As capturas abaixo usam fixtures sintéticas. O aviso de cookies pendente está incluído; não foi mascarado.

Ambiente isolado em `output/link-detail-layout/validation`, usando as dependências locais existentes e portas 7600/7933/8699/9043, PostgreSQL 10033 e Redis 10980. Testes HTTP em PostgreSQL descartável separado na porta 10034. Serviços e containers próprios encerrados após os testes; nenhum processo do usuário foi encerrado.

## Limites e contratos preservados

Não houve deploy. Emulação mobile não representa teste em aparelho físico; axe e revisão visual não certificam acessibilidade integral. Preservados cabeçalho compartilhado, logo, AgeWall, renderização no servidor, SEO/canonical, conteúdo oculto, surfaceToken, caminhos `/go`, favorito, denúncia e eventos de acesso. Não foi alterada a elegibilidade/ordenação dos recomendados. Dados opcionais ausentes não geram placeholders.

## Capturas

[Galeria desktop/mobile](preview.html).

- [Desktop](detalhes-desktop.png) e [mobile](detalhes-mobile.png).
- [Viewport desktop](viewport-desktop.png) e [mobile](viewport-mobile.png).
- [Texto a 200% em 320 px](zoom-mobile.png).

## Reversão

Patch incremental: [changes.patch](../../../../output/link-detail-layout/changes.patch). Cópias anteriores em `output/link-detail-layout/before`. O patch cobre somente esta etapa e preserva as alterações anteriores de Minha página, filtros e financeiro.

`git apply -R --check output/link-detail-layout/changes.patch` passou. Revisar o patch antes de aplicá-lo ao contrário; não usar reset global. A galeria é documentação local e não participa do runtime.
