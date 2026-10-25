# Ondas — revisão independente da fonte final

Data: 23/10/2026. Revisão somente de leitura da implementação; este relatório é o único arquivo escrito pelo revisor. Escopo: ajustes finais de atmosfera, shell, cards/detalhe, primitivas e ligação do fluxo real de mídia. Spec e plano de 23/10/2026, relatórios T1/T3/T4 e revisão de segurança de mídia foram consultados. A árvore compartilhada contém trabalho anterior; os achados não atribuem esse trabalho à migração.

## Achados materiais

### P1 — limite do BFF bloqueia anexos válidos antes da API

- Local inicial: `frontend/src/lib/upstream.ts:29`; relações: `frontend/src/features/link-media/prepare-link-media.ts:37`, `frontend/src/app/bff/[...path]/route.ts:18`, `backend/src/http/controllers/@Links/routes.ts:655`, `backend/src/http/controllers/@Links/media.ts:50`.
- O preparador aceita capa de até 1 MiB de bytes, representada por até 1.398.104 caracteres base64. Criação e PUT de mídia têm limite de 2 MiB no servidor, mas `forward` devolve 413 para qualquer corpo maior que 1 MiB, sem abrir conexão. Uma capa válida acima de aproximadamente 768 KiB, ou a combinação de ícone e capa, falha na interface real. Uma fixture de 2×2 px não exercita esse limite.
- Correção mínima sugerida: limite de 2 MiB somente para os métodos e caminhos exatos de criação de link e PUT dos dois slots; preservar 1 MiB para os demais endpoints e bloquear acima de 2 MiB antes do socket. Considerar query string sem ampliar os padrões para rotas semelhantes.
- Regressão necessária: corpo acima de 1 MiB chega ao upstream apenas nessas rotas; acima de 2 MiB não abre conexão; caminhos/métodos vizinhos mantêm a proteção original. Não aumentar globalmente o limite.
- Resolvido por reinspeção da fonte: `forward` deriva o pathname antes da query e usa 2 MiB somente em `POST /api/v1/links` e `PUT /api/v1/links/[A-Za-z0-9_-]+/media/(icon|image)`. A igualdade do match inteiro rejeita terminadores CR/LF. Métodos/caminhos vizinhos, barra final e demais operações mantêm 1 MiB; acima do limite continua sem socket.
- O teste novo de `upstream.test.ts` foi lido: exerce 1 MiB + 1, 2 MiB, 2 MiB + 1, query, métodos vizinhos, prefixos, barra final, travessia, encoding e CR/LF. O implementador registrou RED com 413 e GREEN de cinco arquivos/12 testes; o revisor não executou esses testes. Os callers produtivos usam o caminho exato sem barra final.

### P2 — favorito perde contraste sobre foto clara

- Locais iniciais: `frontend/src/components/domain/link-row.module.css:48` (`.cornerAction`, linha sujeita a mudanças), `frontend/src/features/favorites/components/favorites.module.css:42`.
- A ação fica posicionada no topo do artigo, sobre a foto quando presente. O botão é transparente e a estrela usa `--status-warning-text`, `#ffe0a3`. Sobre uma imagem branca válida, a razão de contraste calculada é 1,28:1. A integração de imagens reais introduz esse caso em home, busca e facetas.
- Correção mínima sugerida: superfície controlada para a ação ou posicionamento na região textual, preservando clique independente, foco visível e área de toque de 44 px. Evitar decidir a posição apenas pela URL, pois a imagem pode falhar e ser omitida.
- Resolvido por reinspeção da fonte: `.cornerAction` ganhou fundo `--surface-popup` controlado, forma circular e reflexo. O botão interno mantém 44×44 px, estados e clique independente. O fundo de popup é 96% opaco e reduz a influência da foto. A confirmação visual de foco e fotos claras/escuras permanece no runner central.

### P2 — card real não recebia o material aprovado

- Local inicial: `frontend/src/components/domain/link-row.module.css:9`.
- O catálogo real usava `--surface-raised` com borda simples, sem backdrop, reflexo ou sombra de vidro. Os estilos globais de `.link-card` não atingem `.link-row`. Isso deixava o componente central próximo do card navy já rejeitado pelo usuário, enquanto o preview usava material próprio.
- Resolvido por inspeção após correção do coordenador: card real usa `--surface-glass`, `--glass-border`, `--glass-shadow`, reflexo CSS e blur/saturação; patrocinados mantêm tratamento e rótulo distintos. Hover só move em ponteiro com hover e sem preferência de redução; a transição é removida com reduced-motion. Detalhe summary/about recebeu o mesmo material. Nenhum shader ou estado de ponteiro foi criado por card.
- Isso confirma implementação da direção na fonte; não constitui aprovação visual do novo build.

### P3 — dois tokens inexistentes na UI nova de mídia

- Local inicial: `frontend/src/features/link-media/link-media.module.css:3`, `:7`.
- `--color-text-secondary` e `--color-border-default` não têm declaração em `frontend/src`. A cor do hint cai para herança e toda a declaração da borda de asset fica inválida. Usar `--text-secondary` e `--border-default` existentes.
- Resolvido por reinspeção da fonte: os dois consumidores agora usam `--text-secondary` e `--border-default`, presentes nos tokens globais.

## Resultado da reinspeção

Os quatro achados acima foram corrigidos e relidos na árvore compartilhada. Não restou bloqueador confirmado neste recorte de fonte. Isso não encerra a validação central nem amplia o recorte para uma auditoria completa de todas as regras, todos os componentes ou todas as telas. Nenhuma evidência de navegador anterior foi tratada como aprovação das correções novas.

## Contratos conferidos no código atual

- `WaveCanvas` mantém shader original, DPR limitado a 1,25 e desenho limitado a 30 fps. Pausa, reduced-motion, aba oculta e interseção suspendem o loop contínuo; pausa preserva tempo em ref. Falha de contexto/compilação não impede conteúdo e a atmosfera tem fundo CSS independente. Cleanup cancela frame, desconecta observadores/listeners e exclui recursos GL.
- A ferramenta densa (`quiet`) não monta WebGL. Linhas SVG são decorativas, sem eventos; pausa e reduced-motion removem seu movimento. Transparência reduzida oculta as camadas decorativas e troca tokens por superfícies opacas.
- `SiteShell` conserva os retornos sem chrome para host e publicações personalizados. O logo escuro usa a geometria original com pigmento de texto adaptado. Limite percentual e `min-width:0` evitam o tamanho intrínseco anterior; validação de zoom real continua a cargo do runner central.
- `CatalogImage` omite nó para URL ausente e remove a imagem em erro. O detalhe tem foto irmã da síntese; `:has(> .image)` ativa duas colunas somente quando o nó existe. Em telas menores, a ordem é foto e síntese. Sem suporte a `:has`, permanece a composição de uma coluna. Não há wrapper vazio após falha.
- O card mantém foto acima do texto sem texto sobre ela. A área estendida do link preserva href, enquanto favorito/ações têm camada independente. O detalhe mantém SSR, metadata/JSON-LD, `trackedGoPath`, `surfaceToken`, impressão, age wall e relacionados.
- Projeções opcionais aprovadas alimentam home/faceta, busca/sugestões, detalhe, relacionados, favoritos e coleções. A leitura pública dos bytes preserva elegibilidade, tenant e idade. BFF preserva bytes, `image/webp`, `nosniff` e `private, no-store`. A revisão de segurança dedicada já cobre mutação/transação; não foi repetida como nova auditoria completa.
- Select e DatePicker usam superfície de popup controlada e os tokens de foco. Pares semânticos de status e tinta da ação primária permanecem corrigidos. O renderer do gráfico foi relido usando `--color-link` para linha/barra em fundo escuro.

## Evidência e limites

Grafo consultado primeiro com `graphify query "SiteShell WaveCanvas LinkDetail CatalogImage LinkMediaAsset" --budget 1800`: 7371 nós; resposta truncada e índice anterior à extração/mídia, portanto relações novas confirmadas diretamente na fonte. O revisor não reindexou a árvore compartilhada.

Nenhum navegador, E2E, teste, build, banco ou captura foi executado por este revisor. O cálculo de contraste é matemático a partir das cores explícitas; não é medição de screenshot. Capturas anteriores não validam as correções posteriores. O runner central deve verificar fotos claras/escuras, sem foto/falha, desktop/mobile/320 px/zoom, foco/teclado, estado pendente/rejeitado e roundtrip real de mídia.

As verificações automáticas relatadas por implementadores são atribuídas a eles. Não há prova aqui de inspeção visual de 95 rotas, acessibilidade total ou produção validada. A migração aditiva precisa ser aplicada no ambiente de destino antes do servidor novo; nenhum deploy ou banco de produção foi alterado nesta revisão.
