# Correção dos engasgos ao rolar a home — 26/10/2026

## Resultado e decisão

Aplicada uma redução do custo dos efeitos compartilhados da plataforma, preservando navy/turquesa, transparência, bordas iluminadas, tipografia e composição.

- O fundo mantém a composição WebGL estática. O canvas desenha ao montar, redimensionar ou recuperar o contexto, sem continuar animando durante a leitura/rolagem.
- Linhas e luzes da atmosfera compartilhada ficam estáticas.
- LiquidLens compartilhado passou a ser uma apresentação em CSS: blur de 0,65 px, saturação, tint e borda. Não cria filtros SVG RGB, mapas canvas, ResizeObserver ou listeners de ponteiro por controle.
- A implementação refrativa original foi movida para o componente próprio da galeria Ondas. A galeria conserva animação, pausa, refração, transparência reduzida e fallback.
- Select recebeu um slot de composição para o fundo do trigger, usado pelos dois selects da galeria; o padrão dos controles reais continua leve.
- Os contratos de navegação, surfaceToken, favoritos, patrocinado, idade, consentimento e publicação não foram alterados.

O ajuste afeta o material compartilhado usado na home e em outras telas da plataforma. Não é uma reestruturação de catálogo, nem uma mudança de regras comerciais. Nenhuma dependência foi adicionada.

## Medição antes/depois

Comparação em cópia local isolada da árvore de trabalho, com build de produção do frontend e PostgreSQL/Redis exclusivos do harness E2E. Dados determinísticos: 48 comunidades fictícias, sem imagens, idioma espanhol e cursor de ordem fixa. A jornada carrega a segunda página antes de medir.

Condições: Chromium do Playwright Test instalado, desktop 1440×900 e mobile emulado 390×844; CPU 4×, sem limitação artificial de rede, três percursos por dispositivo. Cada percurso envia 12 eventos de roda de 240 px, com pausas de 45 ms e cauda de 250 ms. Todos chegaram a scrollY 2880.

| Dispositivo | p95 antes, três percursos | p95 depois, reteste final | Mediana dos p95 antes/depois |
|---|---|---|---|
| Desktop | 200, 167, 100 ms | 50, 83, 50 ms | 167 / 50 ms |
| Mobile emulado | 83, 83, 83 ms | 17, 17, 17 ms | 83 / 17 ms |

As duas passagens intermediárias do ajuste tiveram p95 desktop 50/50/50 ms e mobile 17/17/17 ms. O JSON conserva todos os resultados, inclusive máximos e variações, sem escolher apenas a melhor execução.

Esses números medem intervalos entre callbacks de requestAnimationFrame. Não são FPS efetivamente apresentado, latência física ou INP de campo. A rolagem não entra no cálculo de INP. O desktop ainda apresentou intervalos acima de 16,7 ms no laboratório com tracing/CPU limitada: não há certificação de 60 fps ou de ausência absoluta de engasgos em todos os aparelhos. Há redução reproduzida do custo e retirada das duas fontes contínuas de trabalho identificadas.

Uma inspeção exploratória adicional por Playwright MCP na home local, após aquecimento, registrou p95 de aproximadamente 6 ms nesse outro navegador/headless. Retirar também o pequeno blur não mostrou vantagem consistente nas repetições; o blur foi mantido. Esse ensaio usa outro ambiente e não foi misturado à tabela principal.

## Verificações executadas

| Verificação | Resultado |
|---|---|
| Teste da lente antes da implementação | Falhou como esperado: havia SVG e observador por controle. |
| Testes focados iniciais | 30 passaram em cinco arquivos. |
| Suíte completa frontend | 852 passaram em 226 arquivos, após simplificar a lente e fixar o fundo. |
| Slot adicional da galeria e lente | 11 testes focados passaram após a mudança de composição do Select. Esses testes se sobrepõem à suíte anterior. |
| Lint | Passou. |
| Typecheck, incluindo E2E | Passou; repetido após finalizar o driver de toque. |
| Build de produção | Passou na cópia isolada, por meio do mesmo next build usado pelo harness. |
| Plataforma, passagem ampliada | 19 dos 20 cenários passaram; o caso restante usava um comando de gesto que não deslocou a página no emulador. |
| Reteste da home | 2/2 passaram, desktop/mobile, após trocar esse comando por touchStart/touchMove/touchEnd. A expectativa de deslocamento foi mantida. |
| Galeria Ondas | 10/10 passaram em desktop/mobile: refração visual, falta de canvas 2D, transparência reduzida, movimento/pausa, card/favorito/select. |
| Inspeção Playwright MCP | Home local em contexto isolado: 0 SVGs em lentes; 0 animações na atmosfera; sem overflow em 1440/390; Menu/Escape devolve foco; sem pageerror. Forced colors/reduced motion também inspecionados. |
| Impeccable detector | Sem achados nos alvos alterados. |
| Descoberta da regressão no CI | playwright.visual.config.ts lista o novo teste em ui-desktop e ui-mobile, preservando os testes anteriores. |
| Correspondência de fontes | Hashes dos arquivos alterados conferidos entre workspace e cópia validada. |

Os cenários da plataforma cobriram scroll, Mostrar mais, URL do card com surfaceToken, foco do link/favorito, reflow de 320 px, zoom desktop de 200%, busca com loading/falha/recuperação/vazio, teclado, aviso +18, formulários antes da hidratação, cards com/sem capa, erro de imagem, redimensionamento e perda/recuperação da GPU. Os testes aplicáveis executaram axe sobre as páginas; isso não certifica acessibilidade integral.

As capturas de topo e cards foram abertas e examinadas, com manutenção da hierarquia, leitura e foco. Nenhuma baseline existente foi atualizada. A verificação refrativa da galeria foi delimitada ao main da demonstração, porque o cabeçalho compartilhado agora usa o vidro leve.

O baseline mobile inicial também detectou que aplicar CSS zoom 200% sobre uma viewport de 390 px produzia uma largura efetiva abaixo de 320 px. O teste foi corrigido para avaliar reflow mobile de 320 px e zoom desktop de 200%; não foi alterado o produto para acomodar uma simulação de pinch que não corresponde ao comportamento mobile.

## Ambiente e comandos

Raiz de validação: output/scroll-home-validation-20261026. Cópias de frontend/backend usam junctions apenas para dependências já instaladas. O diretório de build é próprio dessa cópia, sem sobrescrever o build do servidor de desenvolvimento existente.

Harness: E2E_PORT_OFFSET=12000 e E2E_RUN_ID=scroll-home-20261026. Usou portas 15000, 15333, 16099, 16443, 17433 e 18380 e containers divulgador-e2e-pg-scroll-home-20261026 / divulgador-e2e-redis-scroll-home-20261026. Mocks de e-mail/pagamentos e ausência de chave OpenAI mantidos. Containers e servidores próprios foram encerrados; serviços existentes não foram encerrados.

Comandos principais:
- npm test
- npm test -- src/components/ui/input.test.tsx src/components/ui/liquid-lens.test.tsx
- npm run lint
- npm run typecheck
- npx playwright test --config playwright.scroll-check.config.ts, na cópia, selecionando home-scroll, frontend-experience, ondas-glass e os testes pertinentes de catalog.
- npx playwright test --config playwright.ondas.config.ts --grep 'refração muda|sem mapa|transparência reduzida|fundo tem movimento|card inteiro', com a prévia local e rotas mockadas.
- Para repetir a regressão integrada: npm run test:e2e -- --config playwright.frontend-experience.config.ts home-scroll.spec.ts. Usar ambiente/portas próprios se os padrões estiverem ocupados.

Uma tentativa de iniciar a suíte da galeria enquanto o mesmo snapshot ainda executava a plataforma foi recusada pelo lock existente. O lock foi respeitado; a execução posterior passou.

Avisos do build incluíram raiz inferida por múltiplos lockfiles e itens de cache CSS não serializáveis em arquivos fora da alteração. Não foram removidos lockfiles ou ampliado o escopo para silenciá-los.

## Arquivos e evidências

Implementação:
- frontend/src/components/ui/liquid-lens.tsx
- frontend/src/components/layout/ondas-atmosphere.tsx e ondas-atmosphere.module.css
- frontend/src/components/ui/select.tsx
- frontend/src/features/ondas-preview/liquid-lens.tsx e wave-home.tsx

Regressão:
- frontend/src/components/ui/liquid-lens.test.tsx e input.test.tsx
- frontend/e2e/home-scroll.spec.ts
- frontend/e2e/ondas-preview.spec.ts
- frontend/playwright.frontend-experience.config.ts e playwright.visual.config.ts

Documentação: DESIGN.md, este relatório e graphify-out/ESCOPO.md.

Evidências preservadas em evidencias/2026-10-26-scroll-home-correcao:
- medicoes.json: quatro fases, 24 percursos.
- source-hashes.json: correspondência com a cópia validada.
- desktop-top.png, desktop-cards-focus.png e mobile-cards-focus.png.

Traces, capturas adicionais e logs de build permanecem em output/scroll-home-validation-20261026. O grafo foi atualizado incrementalmente em modo code-only, sem LLM/API externa ou clustering: 9523 nós/35667 relações na passagem anterior ao fechamento. A árvore é compartilhada; o delta não representa autoria exclusiva. CSS, imagens e comportamento são comprovados pelas verificações, não pelo índice.

## Limites e reversão

### Integração solicitada na main

Após o pedido explícito de subir para main, a correção foi isolada em checkout temporário da main 6268cd32. As alterações pendentes de produto, backend, busca e CI da pasta original não foram incluídas. Sobre essa árvore: 800 testes frontend passaram em 214 arquivos; lint, typecheck, build de produção e oito E2E de experiência desktop/mobile passaram novamente. As diferenças na contagem da suíte refletem a exclusão do laboratório ainda não integrado, não remoção de testes desta correção.

As seis telas com imagens de referência do CI foram comparadas em Chromium Linux 1.63.0, nas viewports desktop/mobile. A referência Linux de painel-links-novo em desktop precisou de atualização após inspeção da imagem e do diff: um pixel acima do limiar perceptual, com hierarquia, textos e layout preservados. Não se aumentou tolerância nem se mascarou conteúdo. As referências Windows já apresentavam diferenças maiores de conteúdo/altura frente à main atual e foram preservadas.

O grafo da integração foi atualizado sobre a árvore limpa da main: 7966 nós/28607 relações, sem código do laboratório pendente. O push solicitado aciona o CI normal; a publicação em produção permanece condicionada aos checks do workflow. Não foi executado deploy manual.

Na etapa de implementação anterior ao pedido de integração não houve commit, branch, push ou deploy. Não houve teste em aparelho físico, Safari/Firefox ou medição de campo. O ensaio usa dados sem capas; o comportamento com imagens foi verificado funcionalmente pelo teste de masonry, não como benchmark de rolagem. A inspeção de outras telas foi limitada às jornadas listadas, embora o material seja compartilhado.

Para reverter, revisar apenas os arquivos desta alteração e as evidências novas. Não restaurar arquivos inteiros nem usar git reset/revert sobre a árvore compartilhada: existem alterações anteriores de outras tarefas, inclusive no catálogo, CI, backend, dependências e grafo.

Pesquisa anterior e fontes técnicas: [diagnóstico inicial](2026-10-26-scroll-home.md), [INP e exclusão de scroll](https://web.dev/articles/inp) e [animações e custo de renderização](https://web.dev/articles/animations-guide).
