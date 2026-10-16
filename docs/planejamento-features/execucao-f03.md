# F03 — links relacionados

## Escopo e D04 — 16/10/2026

Autorização: implementar somente a próxima feature e parar, na branch `codex/roadmap-features`, baseline `c9aa839`. Preservar mudanças e artefatos anteriores; sem main ou deploy.

D04: seis sugestões por página, ordenadas por mesmo nicho e rede, mesmo nicho, depois mesma rede; empate por ID ascendente, sem aleatoriedade ou embeddings. Excluir o próprio ID e URL canônica, duplicados por URL canônica, candidatos sem relação, indisponíveis, não publicados e donos suspensos. Isolar tenant inclusive nos joins de nicho/rede. Respeitar idade na consulta e no carregamento do servidor, sem depender da ocultação visual.

RELATED é uma superfície de analytics, não uma superfície comercial nova. As posições pagas existentes continuam HOME/SEARCH/NICHE. Campanha em outra área não torna uma sugestão patrocinada; no MVP sponsored=false. O renderer existente continua identificando patrocinado quando recebe esse contrato; não inventar preço ou alcance pago em RELATED para cumprir AC02.

Reutilizar LinkRow, CatalogGrid, AgeWall, Impression, saída /go, assinatura surface-token e projeção pública. Impressão conserva a semântica existente: abertura do detalhe atribuída à origem, não um novo evento de visibilidade de card. Clique continua sendo a saída por Acessar. RELATED separa esses eventos de ORGANIC e das posições pagas. Não coletar novos dados pessoais ou alterar consentimento.

## Implementação e validação

S0–S7 concluídas na branch; AC01–AC04 aprovados, com evidências locais e CI abaixo. A próxima feature não será iniciada após esta entrega.

## Contratos, reuso e fronteiras

GET `/api/v1/links/:id/related?cursor` é público, com host resolvido pelo mecanismo atual e cache `private, no-store`. Entrada estrita, ID e cursor limitados, 400 para cursor inválido e 404 para origem ausente, oculta ou de outro tenant. A resposta contém somente ID, nome, descrição, referências públicas de nicho/rede, `sponsored`, token assinado e, quando habilitada a configuração existente, impressões. A configuração de impressões conserva o parser atual: valor `0` desliga; ausência mantém o comportamento vigente.

A consulta específica em related-links-repository tem responsabilidade distinta do ranking semântico e da vitrine paga. Reutiliza PUBLIC_LINK_FILTER, configurações e contadores existentes, acrescentando consistência de tenant nos joins e elegibilidade do proprietário. O domínio puro organiza prioridade, exclusões e cursor; não importa HTTP nem persistência. Não há novo modelo de recomendação, IA, fila, serviço externo ou dependência.

No frontend, a rota compõe RelatedLinksSection em Suspense e dentro do AgeWall existente. O servidor entrega o primeiro lote; paginação e recuperação ficam no componente cliente, com CSS Module. LinkRow, CatalogGrid, Button, API/BFF, tokens e renderer de patrocinado são os existentes. Componente de apresentação não acessa sessão ou preços. A leitura inicial tem prazo de cinco segundos para que uma sugestão opcional não impeça a abertura da origem. O transporte compartilhado ganhou prazo opcional e tratamento de erro no stream, com teste HTTP local de aborto e compatibilidade da chamada sem prazo.

## Persistência, privacidade e consistência

Uma transação RepeatableRead mantém origem, candidatos, configuração e contadores no mesmo snapshot. Cada nova página revalida a publicação atual. A consulta exclui a URL da origem e deduplica URLs canônicas **antes** do limite e do cursor; não consome a página com duplicatas. Retorna seis registros e usa o sétimo apenas para indicar continuação. Cursor HMAC vinculado a tenant, origem, URL, nicho, rede e escolha de idade. Empate por ID ASCII/C; remoção do último registro de uma página não invalida o avanço por chave. Publicações novas podem exigir atualização da primeira página; não se promete snapshot entre requisições distintas.

Restrição de idade considera nicho **ou rede** no endpoint, tanto para a origem quanto para os candidatos. Origem restrita sem aceite retorna lista vazia sem expor sugestões. Quando o AgeWall do detalhe pede o aceite, o servidor não embute candidatos restritos no HTML/RSC; o cliente carrega após o aceite real pelo endpoint de idade. Limite existente identificado: o detalhe público usa `niche.requiresAge` para seu AgeWall. Esta feature protege suas próprias sugestões também pela rede, mas não declara ter corrigido a política de renderização de todos os detalhes antigos.

Não há retenção, backfill, tabela de recomendações ou dados pessoais novos. Leitura repetida não cria eventos nem promoções. Analytics continua sujeito aos mecanismos existentes de sessão, exclusão de dono/admin, deduplicação e retenção de 12 meses. A coluna AnalyticsEvent.surface já é String; a hipótese inicial de enum de banco não se confirmou. RELATED foi acrescentada às uniões de assinatura e mapeamento, ao relatório F01 e ao seu rótulo. PromotionSurface continua HOME/SEARCH/NICHE; nenhuma condição comercial foi alterada.

## Migração e recuperação

Migração aditiva `20261016130000_related_link_indexes`: índices parciais por tenant/nicho/ID e tenant/rede/ID para links publicados. Deploy Prisma validado no banco descartável com histórico e no harness E2E. No clone anterior f02_migration_proof, que não possui histórico Prisma, foi aplicado o SQL exato em outro clone f03_migration_proof, sem reset. Hashes de todas as linhas de links e promoções permaneceram iguais antes/depois da migração, com 10.002 registros de cada tipo.

Depois da prova de preservação, a distribuição sintética do clone foi ajustada para ter poucos candidatos entre 10.002 links. EXPLAIN ANALYZE da consulta real, capturada do repository com seus parâmetros, escolheu naturalmente ambos os índices em BitmapOr, sem desabilitar seqscan. Isso comprova o caminho dessa distribuição; não é benchmark nem estimativa de latência em produção. Criação de índice convencional pode bloquear escrita durante a migração; a janela operacional deve considerar o volume real antes de um deploy futuro.

Ensaio de compatibilidade no clone: o leitor anterior do catálogo continua retornando dados com os índices novos, conservando promoções e eventos RELATED. Reversão operacional: retirar a seção e a rota, mantendo o suporte a RELATED no decoder e nos relatórios para links já abertos e histórico registrado. Os índices podem permanecer. Não remover dados, transformar RELATED em ORGANIC ou reverter cegamente para um decoder que rejeite tokens já emitidos. Nenhum deploy foi realizado.

## Falhas observadas e correções

Os primeiros U/C falharam porque os módulos ainda não existiam; logs vermelhos são distintos dos verdes. A primeira execução PG revelou erros de fixture (status REJECTED inexistente, configuração false em vez de 0 e rota de saída com prefixo incorreto); foram corrigidos conforme contratos existentes, sem alterar produto para acomodar o teste.

No E2E, o cliente HTTP do Node não resolve subdomínios localhost no Windows como o Chromium. As inspeções de HTML usam 127.0.0.1 com Host explícito; a navegação permanece no host real do tenant. A tentativa inicial de interceptar apenas o destino após um redirect não o isolou. O destino agora é um servidor HTTP local do harness, acessado pelo navegador após /go real. BFF, API interna, PostgreSQL, Redis e worker não são interceptados. Não há envio real ao WhatsApp/e-mail nem pagamento real.

A regressão PG antiga da busca comparava ordem indefinida de empates entre dois planos SQL sem ORDER BY. Os índices novos tornaram essa suposição visível: IDs e scores permaneciam iguais. A entrada da comparação de ranking foi normalizada por ID no teste; a função de ranking e a regra comercial da busca não mudaram. O teste continua comparando todos os campos, scores e precedência por relevância.

## Interface e revisão real

Direção visual: continuidade da página de detalhe e dos cards do catálogo, preservando cabeçalho, CTA principal, tipografia, tokens, marcação de patrocinado e navegação. A seção secundária usa título, uma frase e uma ação de continuação. Sem redesign ou biblioteca nova. A seção vazia desaparece; erro mantém cards já carregados; paginação bloqueia duplo envio. Cursor desatualizado oferece atualização explícita da primeira página. Loading mantém ação visível e desabilitada; resposta negada não entra no DOM.

Chrome DevTools inspecionou a página real com fixture própria, independente dos testes: 1280×720, 390×844 com touch e 320px com texto 200%. Duas colunas no desktop e uma no mobile; scrollWidth igual ou inferior ao viewport. Capturas reais abertas e inspecionadas. Navegação por Tab entre sugestões confirmou foco visível no pseudo-elemento do card: contorno navy de 2px com afastamento de 3px. Texto secundário rgb(92,107,127) sobre branco, contraste 5,43:1. Canonical sem token e robots index/follow preservados; detalhe adulto permanece noindex pelo contrato existente. Os atalhos de zoom enviados pelo MCP não alteraram DPR/viewport; a prova efetiva é reflow com texto 200%, sem alegar zoom nativo ou aparelho físico/VoiceOver.

## Cobertura e indicadores

AC01/T01: U e PG01/02/03/06 cobrem origem, duplicatas, status, proprietário, tenant, relações corrompidas, prioridades, cursor e idade por nicho/rede. E02 confere HTML/RSC/DOM e aceite real. AC02/T02: PG04 comprova que promoção SEARCH não patrocina RELATED; C01 comprova o renderer compartilhado de patrocinado. Não existe oferta paga RELATED neste MVP. AC03/T03: C vazio e E01 verificam remoção da seção sem prejudicar a origem. AC04/T04: PG05/E01 comprovam impressão no detalhe e saída RELATED, assinatura/troca de token, deduplicação, exclusão dono/admin, revalidação e compatibilidade ORGANIC; relatório F01 separa RELATED e não atribui esses cliques a campanha SEARCH ativa. E03 cobre paginação, offline, recuperação por teclado e reload em desktop/mobile.

I02 usa a fronteira pública: acesso anônimo permitido, outro tenant recebe 404 sem dados. Não inventar operação privada para cumprir o caso genérico. I03: leitura repetida não produz mutação; eventos repetidos deduplicam. Falhas de transporte e cursor são recuperáveis. Não há job/provedor adicional que exija ensaio de reentrega.

Indicadores reutilizam eventos existentes: cliques de saída e explorações de detalhes pela superfície RELATED, agrupáveis pela sessão já existente. Não medir entrada em grupo, causalidade de recomendação ou visibilidade de cards com esses eventos. Observar erros/duração da rota pelos logs HTTP atuais; não acrescentar payload de candidato ou dados pessoais ao log.

## Fechamento

Resultados locais: 400 testes backend (97 arquivos), 179 frontend (51), 116 PG/Redis (12; seis F03) e 78 Playwright na regressão completa. Após o ajuste de foco, os sete testes do recorte F03/setup passaram novamente em desktop/mobile e o CI repetiu a regressão completa. Lint/typecheck/build dos dois pacotes aprovados; build frontend também executado pelo harness. Zero skips/retries no Playwright.

Commit `2672f834a3f2e34c6e7c794e0f9c31cfb57a885c` em `codex/roadmap-features`. [CI 38917846538](https://github.com/MentesReprogramadas/divulgadorlink/actions/runs/38917846538) aprovado em verify, web, images e e2e. A atualização posterior é documental. Comandos e logs em `evidencias/F03/2026-10-16`: backend npm run lint/typecheck/test/build/test:pg; frontend npm run lint/typecheck/test/build/test:e2e; PG_SPECS=1 com URLs locais descartáveis, E2E_PORT_OFFSET=100 e E2E_RUN_ID=roadmap. Logs vermelhos, provas SQL, JSON e capturas separados dos resultados aprovados. Sem traces com cookies no commit.

O ajuste final de teclado transfere foco para a confirmação visível após paginação solicitada, inclusive ao remover o botão na última página. Capturas finais foram abertas e inspecionadas. S0–S7, matriz, inventário, decisão D04 e índice atualizados. Encerrar após F03 conforme pedido; F04 não iniciada. Produção, main, Coolify, envs e liberações comerciais fora desta entrega.

## Ajuste autorizado de aleatoriedade — 16/10/2026

Solicitação posterior do usuário: deixar as sugestões aleatórias e depois executar F04. A decisão inicial de desempate exclusivamente por ID fica superada. Mantém-se prioridade nicho+rede → nicho → rede; dentro de cada faixa, chave pseudoaleatória MD5(seed+ID), com ID no empate. O seed novo de 128 bits vem de randomBytes por abertura e fica no cursor HMAC v2 para preservar a ordem ao paginar. MD5 serve somente à ordenação, não à assinatura ou segurança; a assinatura continua HMAC-SHA256. Não há cookie ou identificação de visitante nova. Cursores v1 recebem 400 e usam a ação existente de atualizar sugestões. Duplicação canônica continua resolvida antes do embaralhamento SQL.

U05 comprova ordens diferentes entre seeds e estabilidade na mesma abertura; PG07 comprova seeds novos pela rota e paginação sem repetição; U/PG anteriores continuam aplicáveis. O harness fixa seed somente no backend dev para capturas determinísticas, sem ativar essa escolha em produção. Recorte Playwright F03/F04 de 13 testes aprovado; CI e regressão finais deste ajuste serão registrados junto da execução F04. Não houve deploy.

### Aceite do ajuste aleatório

Ajuste bbcd415 incluído no código final `1f283a46cfe0a71cea2afb2abde223cb6dd9eb43`; CI 38923117928 aprovado com sete testes F03 PG, U05 e E2E desktop/mobile dentro da regressão completa de 84. EXPLAIN da consulta embaralhada e logs complementares preservados em evidencias/F03/2026-10-16/randomization. Sem deploy. A continuidade autorizada encerra após F04.
