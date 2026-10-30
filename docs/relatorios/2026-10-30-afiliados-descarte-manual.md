# Ofertas disponíveis com descarte manual — 30/10/2026

## Problema e decisão

A regra v1 descartava automaticamente qualquer anúncio cujo vendedor tivesse reputação POOR (fora da faixa verde). No caso informado, MLB6839186178 / catálogo MLB54325401, a captura registra 2_orange. A nota 4,9 mostrada no Mercado Livre é avaliação do produto e não substitui a reputação do vendedor. Ausência de preço anterior e de histórico não causava o descarte sozinha, mas os textos pareciam exigências e dificultavam entender a decisão.

Pedido do usuário: manter produtos bons disponíveis e melhorar ou remover o descarte automático. A regra v2 mantém anúncios válidos em SELECTED ou REVIEW; reputação e evidências viram informação para revisão. Somente a decisão explícita do administrador marca DISCARDED. Envios anteriores continuam fora das sugestões para impedir repetição.

## Implementação

- `backend/src/domain/affiliates/evaluation.ts`: reputação fora da faixa verde agora leva a REVIEW; evidência de preço e histórico continuam necessárias para o destaque SELECTED, sem excluir os demais. Textos distinguem dados ausentes de reprovação. Uma função compartilhada reclassifica caches v1 preservando histórico, preços e anúncios, sem consulta adicional ao ML ou ao banco.
- `backend/src/use-cases/affiliates/discovery.ts`: aplica regra atual ao ler páginas salvas, antes de sobrepor decisões manuais. Anúncios indisponíveis/falhas da fonte deixam de engrossar o contador de descartados. Não remove escolhas manuais nem histórico de envio.
- `frontend/src/features/affiliates/discovery-panel.tsx`: separa Produtos/Descartados pela decisão explícita, inclusive com respostas antigas em trânsito.
- `frontend/src/features/affiliates/catalog-product-card.tsx`: usa Conferir antes de enviar e identifica a reputação como sendo do vendedor. Mantém revisão e envio explícitos.

Não há desconto ou preço anterior inventado. Na captura do usuário, R$ 149,96 é uma condição no Pix e R$ 163 é o preço nos outros meios. A política alterada não converte preço condicionado em preço universal. A página do ML não ficou acessível via ferramenta web nesta sessão; análise desse detalhe baseada nas capturas fornecidas.

## Validação concluída

- Regressão primeiro: dois testes falharam na v1 por retornar DISCARDED; passaram após a correção.
- Backend: 25 testes unitários afetados passaram; lint, typecheck e build passaram.
- PostgreSQL isolado: 15 testes de descoberta e 7 testes de revisão/envio passaram, incluindo recuperação de cache v1 e preservação de descarte manual/tenant.
- Frontend: 24 testes afetados, lint e typecheck (aplicação e E2E) passaram.
- Build Next de produção isolado concluído pelo servidor do E2E; nenhuma falha de compilação. Avisos existentes de lockfiles/standalone/cache CSS foram mantidos.
- Playwright: 4 testes passaram em desktop e mobile, cobrindo produto com vendedor laranja visível, descarte explícito, paginação, prévia e retorno do foco. Capturas desktop/mobile foram inspecionadas. Dados e transportes do navegador são fixtures; nenhum envio real.
- `git diff --check`: sem erro de whitespace.
- Banco temporário próprio, acessível somente em 127.0.0.1:5654, removido após testes. Primeira preparação com postgres sem vector falhou e foi substituída por pgvector já instalado. O guard de nome de banco do teste de revisão foi respeitado criando outro banco descartável com o nome exigido.
- Primeira execução E2E encontrou parêntese extra no teste novo, corrigido antes da rodada final. Nenhum teste falho foi considerado validação concluída.
- Graphify atualizado incrementalmente, code-only: 20 arquivos processados, 1.703 reutilizados, 8.680 nós e 31.216 relações; sem API/LLM/clustering. Um teste sem símbolos foi reportado pelo extrator. Grafo não substitui validação de runtime.

## Evidências e limites

- `docs/frontend-profissional/evidencias/afiliados-descarte-2026-10-30/desktop.png`
- `docs/frontend-profissional/evidencias/afiliados-descarte-2026-10-30/mobile.png`

Publicação posteriormente autorizada pelo usuário: commit `d8374eeff01194ca14bd4e4d80c626c57949e998`, workflow [41080079096](https://github.com/MentesReprogramadas/divulgadorlink/actions/runs/41080079096), concluído com sucesso. Os quatro serviços foram publicados no mesmo SHA; API e web passaram nos health checks, bridge e worker em execução, sem readiness de consumo.

Smoke administrativo HTTP em produção, somente leitura, confirmou `policy.version=v2`: 185 produtos na segmentação Pets, 43 SELECTED, 142 REVIEW e zero DISCARDED nesse catálogo. Percorridas as páginas para conferir o exemplo MLB6839186178 / MLB54325401: REVIEW, v2 e sem decisão manual. Autorização usa administrador ativo existente, tenant conferido e credencial temporária mantida apenas em memória; nenhum token foi exibido ou salvo. O primeiro smoke com fetch nativo não preservou Host e recebeu503; usando transporte HTTP com Host explícito, como o proxy do frontend, retornou200. A consulta direta à função da imagem publicada também confirmou v2.

Nenhuma conexão WhatsApp, participante ou campanha foi alterada nesta correção. A conta em revisão continua sem novas tentativas. Os novos recursos Shopee, LP Pets e políticas de grupo permanecem fora deste commit.

Reversão: reverter os arquivos de código/testes desta correção para a versão anterior. Nenhuma migração de banco foi adicionada e nenhum descarte manual existente foi apagado. As páginas JSON v1 permanecem armazenadas e são reclassificadas somente na leitura da v2.
