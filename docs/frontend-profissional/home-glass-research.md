# Home reimaginada — pesquisa das nove fontes

22/10/2026. A revisão substitui a direção do UI Lab rejeitado. O pedido vigente é uma home mockada de catálogo de links e uma tela de detalhes, com imagens, cards Liquid Glass, busca, nichos, redes, favoritos e links destacados. Preservar a identidade navy/turquesa do Tem Link Aqui.

## Método e alcance

Revisados catálogos, páginas de componentes, demos públicas e fontes oficiais relevantes à home. Oito fontes abriram no Chromium local; Codrops retornou 403 na navegação direta, mas artigo, demonstração e repositório puderam ser consultados pelo leitor web. Não foi contornada proteção antibot. Motion Primitives retornou 403 no leitor web e abriu normalmente no Chromium. O primeiro controlador remoto sofreu timeouts; a inspeção visual foi feita com Playwright/Chromium local. Refero não está disponível nesta sessão. Nenhuma assinatura, credencial, biblioteca ou serviço pago foi contratado.

As imagens de referência estão em `output/home-glass-research`. Parte das capturas iniciais mostrou conteúdo ainda carregando; Nyx foi reinspecionado pela URL direta do preview e 21st pelo componente específico. A captura de Caustics não comprova que o shader executou nessa GPU. Sua técnica foi confirmada no código oficial. “Revisão das nove fontes” não significa auditoria de cada arquivo de cada biblioteca, itens pagos, login privado ou conformidade completa de suas demos.

## Comparação

| Fonte | Inventário e candidato estudado | Técnica/dependências observadas | Aplicação no Tem Link Aqui |
| --- | --- | --- | --- |
| [React Bits](https://reactbits.dev/get-started/index) | Texto, interação, cards, microinterações e fundos. [Glass Surface](https://reactbits.dev/components/glass-surface), [Tilted Card](https://reactbits.dev/components/tilted-card), Spotlight Card, Fluid Glass. | Variante TS/CSS disponível. Glass Surface atual oferece SVG/WebGL; backdrop explícito é necessário para refração WebGL fora de Chromium. Tilted Card atual tem controle próprio de ponteiro; não presumir Motion por versões antigas. | Referência principal para espessura/refração; inclinação discreta em cards. Evitar cursor invasivo e WebGL por item. |
| [Aceternity](https://ui.aceternity.com/components) | Cards, layouts, fundos, formulários e navegação. [Liquid Glass](https://ui.aceternity.com/components/liquid-glass), [Comet Card](https://ui.aceternity.com/components/comet-card), [Glare Card](https://ui.aceternity.com/components/glare-card). | React, Tailwind/Motion nos exemplos; dependências variam. Liquid Glass documenta refração e fallback frosted; Comet separa profundidade de rotação/deslocamento. | Usar a distinção entre lente e conteúdo e o brilho de borda do card destacado. Preservar texto imóvel e legível. |
| [Magic UI](https://magicui.design/) | Efeitos, texto, fundos, navegação e mídia. [Magic Card](https://magicui.design/docs/components/magic-card), Shine Border e Progressive Blur. | Fonte atual de Magic Card importa motion/react, next-themes e utilitário cn. É spotlight/halo, não lente refrativa. | Referência de luz acompanhando o cursor. Não importar providers globais para obter um reflexo. |
| [Motion Primitives](https://motion-primitives.com/docs) | Primitivas de transição, dialog, conteúdo, scroll e texto. [Morphing Dialog](https://motion-primitives.com/docs/morphing-dialog), Transition Panel, Animated Background. | React, motion/react, portal, lucide-react e helper de click-outside na fonte do Morphing Dialog. | Referência de continuidade entre imagem do card e detalhe. A navegação da demo terá URL real; um modal não substitui a página de detalhes. |
| [Kokonut](https://kokonutui.com/) | Backgrounds, cards, inputs, botões e texto. [Caustics](https://kokonutui.com/docs/backgrounds/caustics-background), [Rain Glass](https://kokonutui.com/docs/backgrounds/rain-glass-background), Magnet Button. | Caustics e Rain Glass usam WebGL2 nativo; “no extra packages” não equivale a custo zero de GPU. Outros itens usam Motion/Lucide. | A luz sob água fundamenta o fundo navy/turquesa. Chuva e gotas são excessivas para leitura contínua do catálogo. |
| [21st](https://21st.dev/community/components) | Marketplace: cards, busca, navegação, galerias, shaders e templates de autores distintos. [Liquid Glass Button, Ali Imam](https://21st.dev/@designali-in/components/liquid-glass-button). | Esse item declara Radix Slot e class-variance-authority; não há uma stack/licença única do marketplace. | Referência secundária de aro/lente no botão de busca. Não adotar um tema inteiro nem adicionar Radix ao projeto que já usa Base UI. |
| [Nyx](https://nyxui.com/) | Cards, fundos, mídia, motion, texto e experimentos 3D. [Apple Glass Effect](https://nyxui.com/components/apple-glass-effect), 3D Layered Card, Reveal Card. | Apple Glass é um container React/Tailwind de filtros CSS, tint, highlights e refração visual; não presumir que todo efeito distorce fisicamente o backdrop. | Referência principal para vidro sobre fotografia e separação entre fundo, tint e conteúdo. Sem copiar o desktop/sistema operacional da demo. |
| [Fancy](https://www.fancycomponents.dev/components) | Tipografia, física, imagens, filtros SVG e composições. [Animated Gradient With SVG](https://www.fancycomponents.dev/docs/components/background/animated-gradient-svg), Parallax Floating, Gooey SVG Filter. | Gradiente combina círculos SVG, blur e variáveis CSS; o exemplo sorteia posições. Outros itens podem usar Motion. | Atmosfera de fundo com movimento lento e posições fixas para SSR e screenshots determinísticos. Sem tipografia que embaralha títulos de links. |
| [Codrops](https://tympanus.net/codrops/) | Tutoriais, demos e direção de arte, não uma biblioteca uniforme. [Atelier UI: WebGL e DOM](https://tympanus.net/codrops/2026/10/21/atelier-ui-webgl-dom/). | Tutorial usa Next 16.3, Tailwind 4, React Three Fiber, Lenis e Motion, com canvas compartilhado. Não corresponde à stack Next 15 atual. | Referência de transição e fotografia como conteúdo. Evitar transplante de providers/scroll global para esta demo. |

## Licenças e uso comercial

| Fonte | Evidência | Limite de incorporação |
| --- | --- | --- |
| React Bits | [MIT + Commons Clause](https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md) | Permite produto comercial nas condições declaradas, mas restringe redistribuir componentes/ports/pacotes. Referência visual e técnica; não copiar para uma biblioteca redistribuível. |
| Aceternity | [Aceternity License / Pro](https://ui.aceternity.com/licence) | Produtos comerciais permitidos nos termos da licença adquirida/aplicável; redistribuição da fonte/marketplace restrita. Isso não confirma licença de todo item gratuito. |
| Magic UI | [MIT](https://github.com/magicuidesign/magicui/blob/main/LICENSE.md) | Preservar copyright/licença se incorporar código aberto. Pro tem termos separados. |
| Motion Primitives | [MIT](https://github.com/ibelick/motion-primitives/blob/main/LICENCE.md) | Preservar avisos se incorporar; validar dependências e acessibilidade do item. |
| Kokonut | [MIT](https://github.com/kokonut-labs/kokonutui/blob/main/LICENSE) e cabeçalho dos dois backgrounds consultados | Código aberto pode integrar produto comercial com avisos; Pro separado. |
| 21st | Página de Ali Imam e marketplace | Licença do arquivo não confirmada; nenhuma permissão uniforme presumida. Não incorporar fonte desse item. |
| Nyx | [Repositório oficial](https://github.com/MihirJaiswal/nyxui) | A página do repositório declara MIT; o README raw devolvido pelo leitor é antigo e não contém licença. Confirmar arquivo/commit antes de copiar; demo própria dispensa incorporação. |
| Fancy | [MIT](https://github.com/danielpetho/fancy/blob/main/LICENSE) | Uso comercial com preservação dos avisos em incorporação. |
| Codrops | [Licenciamento](https://tympanus.net/codrops/licensing/) | Demos de código geralmente MIT salvo exceções; mídia e design freebies podem ter outras restrições. Conferir demo e assets individualmente. |

Não foi incorporada fonte de terceiros nesta proposta. A implementação será própria, com técnicas de plataforma, preservando os termos internos do repositório. Não se apresenta este resumo como autorização jurídica para redistribuir as bibliotecas.

## Seleção aplicada e descartes

| Elemento da nova home | Fundamento | Decisão |
| --- | --- | --- |
| Card com imagem enviada, título e resumo | Tilted Card / Comet / Nyx | Foto reconhecível, vidro nas áreas de interface, título de até duas linhas e resumo truncado. Informação completa no detalhe. |
| Links destacados | Glare / Shine Border | Faixa própria com imagens maiores, aro luminoso e reflexo no ponteiro. Texto Patrocinado sempre presente. Sem estrela de favorito usada como destaque. |
| Busca | Glass Surface / 21st Liquid Button | Campo principal amplo em superfície vítrea com ação clara, sugestões de assuntos e filtros por nicho/rede. |
| Fundo | Nyx / Fancy / Kokonut | Navy com luz turquesa e azul difusa atrás dos cards; movimento lento, controlável e pausado por reduced-motion. Evitar ruído sob texto. |
| Favoritos e exibições | Contratos do próprio projeto | Estrela para favorito, olho para contagem. Na demo os números são fictícios e não geram métricas reais. |
| Detalhes do link | Motion Primitives / Codrops | Imagem ampliada, metadados completos, descrição integral, destino e ação de acesso, relacionados. Navegação com URL e retorno. |

Rejeitados para esta home: partículas sobre texto, cursor customizado, chuva interativa, texto embaralhado, rotação contínua e pilhas que escondem links. Liquid Metal, Holographic, Gooey e WebGL de página inteira podem ser estudos futuros; não são necessários para construir esta direção.

## Identidade e composição

Preservar `--brand-900: #0a192f`, `--brand-300: #4af9eb`, logo e Outfit/Source Sans 3. Adicionar somente cores locais de atmosfera: oceano #133f50, azul vidro #6bacc9 e branco gelo #effbff. Sem roxo dominante ou troca da marca. Componentes normais e destacados devem compartilhar anatomia de catálogo, não parecer cards de produto SaaS.

Home: cabeçalho compartilhado → título curto e busca → assuntos → faixa de patrocinados → filtros/resultados em cards. O conteúdo aparece cedo. Detalhe: caminho de retorno → imagem e painel de metadados → descrição integral e ação → relacionados. Nos dois: contraste, teclado, toque, reflow e reduced-motion fazem parte da definição, não acabamento posterior.

## Imagens e limites do mock

Usar fotos reais pela API de transformação de imagens do Unsplash/Imgix com URLs fixas e parâmetros de tamanho/crop/qualidade. A [documentação oficial](https://unsplash.com/documentation#supported-parameters) diferencia URLs dinâmicas de imagens de endpoints autenticados de busca. Não afirmar uso da API Search sem chave. [Licença das imagens](https://unsplash.com/license) permite uso nos termos indicados; registrar as URLs usadas.

A imagem anexada é uma hipótese de apresentação do mock, não uma funcionalidade de upload já existente no catálogo. A home real hoje usa impressões/surfaceToken, e não se deve converter esse número em visitas únicas. Categoria/nicho/rede ilustrativos serão separados nos fixtures. Cobrança, elegibilidade, aprovação, idade, consentimento e contratos do backend permanecem fora desta demo.
