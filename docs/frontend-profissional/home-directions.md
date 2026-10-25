# Galeria de direções — Tem Link Aqui

Atualização 23/10/2026. **32 direções + Liquid Glass refeita**, em [http://127.0.0.1:3012/dev/homes](http://127.0.0.1:3012/dev/homes). Esta exploração substitui a primeira rodada de 12; não substitui a home pública. Todos os links, contagens e comunidades são demonstrações.

## Inventário e arquitetura

Navy/turquesa, marca, cabeçalho e fontes compartilhadas permanecem. Cada alternativa modifica composição, proporção das imagens, navegação, material e disposição dos cards. Em celular, decoração secundária dá espaço ao catálogo. A capa de Cinema continua fotográfica. Não há direção estética escolhida pelo usuário.

Rotas de servidor compõem e protegem `/dev/homes`, `/dev/homes/[style]` e `/dev/home-preview`. O inventário tipado resolve somente IDs conhecidos. A galeria usa estado cliente somente para filtro de famílias; homes usam cliente para busca, nichos, redes, favoritos e pausa. Dados, Select, ícones, fotos e detalhes existentes são reutilizados. `new-home-directions.ts` e seu CSS contêm as 20 adições; a classe dessas direções não atinge as 12 originais refeitas.

| Direção | ID | Família | Intenção |
| --- | --- | --- | --- |
| Aurora | `aurora` | Luz e atmosfera | Luz em movimento, bento de descobertas e um portal para novos interesses. |
| Metal | `metal` | Material e textura | Prata, relevos cromados e links apresentados em faixas de conteúdo. |
| Holográfica | `holografica` | Material e textura | Reflexos espectrais, prisma flutuante e cards de acabamento holográfico. |
| Magnética | `magnetica` | Interação e física | Fotografias em composição livre e cards que respondem ao seu ponteiro. |
| Orgânica | `organica` | Interação e física | Formas que se encontram, superfícies macias e um catálogo com ritmo orgânico. |
| Ondas | `ondas` | Luz e atmosfera | Um tecido de luz em WebGL, fotografia em janela e profundidade azul. |
| Editorial | `editorial` | Fotografia e conteúdo | A curadoria visual de uma revista, com fotografia e leitura no primeiro plano. |
| Brutalista | `brutalista` | Tipografia e contraste | Tipografia de cartaz, recortes diretos e turquesa em alto contraste. |
| Galeria | `galeria` | Fotografia e conteúdo | Imagens em grande escala, cartões imersivos e um mosaico de interesses. |
| Órbita | `orbita` | Interação e física | Fotografias em camadas 3D, anéis orbitais e novas conexões ao redor. |
| Cinética | `cinetica` | Tipografia e contraste | Letras em movimento, faixas contínuas e uma home com energia de cartaz. |
| Minimalista | `minimalista` | Clareza e espaço | Respiro, navegação direta e fotografia, com o conteúdo conduzindo a experiência. |
| Portal | `portal` | Luz e atmosfera | Uma abertura circular luminosa conduz a um catálogo de imagens em faixas largas. |
| Seda | `seda` | Material e textura | Dobras translúcidas, fundo azul suave e cartões horizontais com acabamento delicado. |
| Constelação | `constelacao` | Luz e atmosfera | Uma carta celeste turquesa, pequenos pontos de luz e um diretório compacto de conexões. |
| Prisma | `prisma` | Geometria e espaço | Planos diagonais, blocos azul profundo e fotografia em janelas de proporções diferentes. |
| Cromática | `cromatica` | Tipografia e contraste | Campos de cor intensos, busca em faixa e destaques de proporção panorâmica. |
| Oceano | `oceano` | Luz e atmosfera | Ondas desenhadas em CSS, profundidade azul e imagens em cartões de bordas aquáticas. |
| Cartões-postais | `cartoes-postais` | Fotografia e conteúdo | Fotografias como cartões de viagem, molduras claras e uma prateleira horizontal de destaques. |
| Arquivo | `arquivo` | Clareza e espaço | Um catálogo de consulta: títulos, imagens pequenas e conteúdo organizado em linhas numeradas. |
| Zine | `zine` | Tipografia e contraste | Colagem de revista independente, fotos recortadas, títulos expressivos e turquesa vivo. |
| Atlas | `atlas` | Geometria e espaço | Linhas topográficas, coordenadas visuais e um catálogo com navegação lateral por assuntos. |
| Cinema | `cinema` | Fotografia e conteúdo | Capa fotográfica em tela larga, contraste de sala escura e destaques em sequência de filme. |
| Vitrine | `vitrine` | Fotografia e conteúdo | Uma vitrine clara de descobertas com imagens grandes, busca direta e fichas com preço visual zero. |
| Discos | `discos` | Material e textura | Uma discoteca de interesses: capas circulares, sulcos gráficos e navegação em prateleiras. |
| Mosaico | `mosaico` | Fotografia e conteúdo | Um mural de imagens com cartões de tamanhos diferentes e destaques que atravessam a grade. |
| Bauhaus | `bauhaus` | Geometria e espaço | Círculos, semicírculos e blocos de turquesa organizam uma composição geométrica de catálogo. |
| Recortes | `recortes` | Material e textura | Papel sobre papel, fotografias com cantos assimétricos e um mural tátil de links. |
| Isométrica | `isometrica` | Interação e física | Fotografias em plataformas inclinadas, linhas de perspectiva e cards largos em três dimensões. |
| Terminal | `terminal` | Clareza e espaço | Um diretório escuro e preciso, com busca dominante, linhas de listagem e etiquetas funcionais. |
| Jardim | `jardim` | Interação e física | Verdes azulados, formas de folhas e fotografia em janelas orgânicas fazem o catálogo respirar. |
| Duotone | `duotone` | Tipografia e contraste | Fotografias em azul e turquesa, grandes superfícies chapadas e destaques em duas colunas. |

## Aprofundamento das nove referências

A [pesquisa anterior](home-glass-research.md) contém a matriz de licenças. Nesta rodada foram revisitados catálogos e candidatos além do vidro:

| Fonte | Candidatos e contribuição | Limite observado |
| --- | --- | --- |
| [React Bits](https://reactbits.dev/) | [Aurora](https://reactbits.dev/backgrounds/aurora), [Silk](https://reactbits.dev/backgrounds/silk), [Magnet](https://reactbits.dev/animations/magnet): atmosferas, tecido e resposta ao ponteiro | Não importar o registry nem presumir dependências iguais entre efeitos; licença MIT+Commons Clause requer atenção à redistribuição |
| [Aceternity](https://ui.aceternity.com/components) | [Hero Parallax](https://ui.aceternity.com/components/hero-parallax), Vortex, Background Lines: profundidade, planos de mídia e fluxo | Não adotar scroll global, Motion/Tailwind ou providers por efeito; códigos gratuitos e Pro têm condições distintas |
| [Magic UI](https://magicui.design/docs/components) | [Retro Grid](https://magicui.design/docs/components/retro-grid), Marquee, Orbiting Circles: perspectiva, faixa tipográfica e órbita | O grid não deve passar sob texto a ponto de prejudicar contraste; não transportar o tema de demonstração |
| [Motion Primitives](https://motion-primitives.com/docs/animated-background) | Animated Background, Transition Panel e Text Loop: seleção e continuidade das respostas | Leitor web retornou 403, Chromium local abriu 200; movimento semântico difere de animação decorativa de fundo |
| [Kokonut](https://kokonutui.com/docs/backgrounds/drape-background) | Drape, Wind, Ink e Topo: tecido, relevo e tinta, além de Caustics já revisado | Drape declara React/WebGL/simulação de tecido, sem pacote extra. Captura inicial sem canvas não comprova execução da simulação |
| [21st](https://21st.dev/community/components) | [Shaders](https://21st.dev/community/components/s/shader), Backgrounds, Heroes e Galleries: amplitude de linguagem e mídia | Marketplace heterogêneo. A URL inferida `/community/components/shaders` retornou 404; a navegação real levou a `/community/components/s/shader`, consultada com sucesso. Não copiar arquivos com licença não confirmada |
| [Nyx](https://nyxui.com/components/morphing-blob) | [Morphing Blob](https://nyxui.com/preview/morphing-blob-demo), Liquid Metal Button, 3D Layered Card: material, volumes e silhueta | Demo do blob foi inspecionada em Chromium. Não adicionar Three para uma hipótese de composição |
| [Fancy](https://www.fancycomponents.dev/docs/components/filter/gooey-svg-filter) | Gooey SVG Filter, Parallax Floating, Breathing Text e Simple Marquee: união orgânica, posição e tipografia | A própria documentação avisa suporte limitado de Gooey em Safari; aplicar somente em formas decorativas, com alternativa CSS |
| [Codrops](https://tympanus.net/codrops/2026/10/19/paper-shaders-off-background/) | Paper Shaders off the Background e Atelier UI: material também na mídia/interface e conexão entre DOM/GPU | Navegação direta do catálogo retornou 403; artigo público foi lido pelo leitor web, sem contornar bloqueio. Não transplantar WebGPU/R3F/Next 16 |

Novas capturas e textos públicos consultados: `output/home-glass-research/style-*.png` e `style-sources.json`. Parte das capturas mostra demos ainda não carregadas: não tratar essas áreas vazias como resultado estético do componente. Refero indisponível. Sem compra, chave nova, envio de código a terceiros ou instalação de biblioteca. Context7 consultado em Next 15.1.11, versão 15 mais próxima disponibilizada; projeto permanece em 15.5.26.

Implementação original em CSS/SVG e um shader WebGL próprio. Não há incorporação de fonte das bibliotecas. MIT dos projetos de origem não licencia automaticamente fotos, templates Pro, marketplace inteiro ou redistribuição. Fotos são as nove já registradas no mock, com fallback e fixtures determinísticas.


## Interações e limites de execução

Anterior/Próxima percorre 32 direções em ciclo. A Liquid Glass tem entrada própria na galeria. Busca ignora acentos; nicho/rede e favoritos combinam seus filtros; há estado vazio e recuperação. Favoritos são locais. Patrocinados continuam explícitos, inclusive nas entradas compactas. O detalhe valida `home` pelo inventário e retorna à direção escolhida.

Apenas Ondas usa WebGL, com shader próprio, canvas único, DPR limitado, pausa quando fora da tela/aba, reduced-motion e fundo alternativo sem GPU. Outras opções usam CSS/SVG. Eventos de ponteiro nos cards limitam-se a Magnética/Órbita/Holográfica, sem loop contínuo. Novos efeitos não exigiram Motion, Three, Tailwind, shadcn ou dependência adicional. Nenhum lockfile foi alterado por esta tarefa.

`SiteVisits` continua excluindo as duas famílias de demo e seus descendentes. As rotas retornam 404 fora de desenvolvimento e têm noindex. Sem mudança de cobrança, autorização, moderação, quotas, contratos ou analytics públicos. Imagens remotas usam allowlist fixa existente; miniaturas da galeria são capturas reais das páginas, com origem embutida nos 33 JPEGs. Não existe API autenticada de busca de imagens, upload nem conexão das demos com catálogo real.

## Revisão e validação desta rodada

[Configuração e evidências das skills](design-skills-e-homes-2026-10-22.md). Regras globais do Codex incluem Emil, Impeccable, Taste frontend e Playwright MCP isolado. PRODUCT.md registra contexto; DESIGN.md e sidecar extraem somente tokens globais observados, sem promover as paletas das demos.

Revisão inicial identificou repetição de estrutura, hero longo, vazios no título dos cards, texto pequeno e hover lento. Foram refeitas as 12 existentes e acrescentadas 20. Revisão independente final inspecionou as 32 aberturas desktop/mobile e detalhou quatro correções: legibilidade de Prisma, foto de Cinema, rótulos patrocinados/favoritos compactos e estado inicial das prateleiras. O verdict pass pontuou **as quatro como resolved**, disposition ship, apenas nesse escopo; não é aprovação estética do usuário nem certificação de todos os estados.

Detector Impeccable executado uma vez: easing com overshoot foi substituído; grade holográfica permanece como estética explicitamente autorizada; o aviso de imagem com src ausente era limitação do parser diante de ref com arrow function, e src foi colocado primeiro. Todas as fotos são verificadas no navegador. Não houve segundo detector nem declaração de relatório zerado.

Taste inspector executado em Liquid Glass e Arquivo a 1440/768/390. Ambos terminaram sem FAIL. Liquid Glass usa exceções explícitas `gradient,text-shadow,button-fx` pelo material pedido; `covered-text` cobre cartões fora da janela dos trilhos horizontais, não esconde conteúdo sobreposto. Esse caso é inspecionado com o trilho reiniciado e cada foto percorrida nos testes. Avisos sobre uso de cor, bordas, favoritos circulares, título grande, proporção de texto secundário e conteúdo abaixo da dobra são registrados como escolhas dessas explorações, não erro de acessibilidade. Arquivo mantém Georgia no display, Outfit nas seções e Source Sans na leitura. Não houve aprovação irrestrita pelas regras estéticas do inspector.

**Resultados finais:** lint, typecheck e build passaram. Suite unitária completa: 162 arquivos/563 testes; repetição dos três arquivos diretamente afetados: 10 testes. E2E final sem atualização de snapshots: **68 testes das direções +8 da Liquid Glass/detalhes**, total **76**, com **64 comparações das aberturas +4 da home/detalhe Liquid Glass**. Axe nas áreas novas, fotos/fallback, teclado, reflow320/768/1280, zoomCSS200%, filtros, favoritos e ausência de escritas BFF passaram. Build isolado preservou o servidor3012; avisos existentes foram registrados. Detalhes mantêm três relacionados por linha no desktop; a grade de duas colunas fica restrita ao catálogo Liquid Glass. Capturas integrais ficam em `output/home-glass-research`; sheets de comparação e parecer em `output/design-skills-2026`; miniaturas servidas em `frontend/public/home-directions`. Baselines de regressão cobrem as aberturas; contenção, fotos, Axe, filtros e reflow verificam o restante das páginas. Não aumentar tolerância para ocultar diferenças.

Sem teste em aparelho físico, Safari/Firefox, leitor de tela ou GPU mobile. Sem métricas de campo de FPS, bateria, LCP ou conversão. O custo relativo dos efeitos não é medição de hardware.

Reversão: remover somente rotas/feature/testes/imagens de `home-directions` e reverter os ajustes desta rodada nos arquivos de `home-preview`. Regras/skills/MCP globais são independentes do app. Preservar alterações anteriores e concorrentes; sem commit, push ou deploy.
