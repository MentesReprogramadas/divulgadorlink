# Minha página — bibliotecas, componentes e ferramentas prontas

Data: 25/10/2026. Complemento da [pesquisa](2026-10-25-minha-pagina-pesquisa.md), da [spec](2026-10-25-minha-pagina-studio-design.md) e do [plano](../plans/2026-10-25-minha-pagina-studio.md). **Pesquisa e decisões propostas; nenhum pacote, MCP ou skill instalado nesta etapa.**

## 1. Resultado e método

Há soluções prontas que reduzem trabalho de animação, navegação e composição 3D. Recomenda-se reuso seletivo: manter documento, editor, apresentação pública, autorização, publicação e pipeline próprios; aproveitar motores e exemplos com finalidade concreta. Não há motivo para construir física de carrossel, interpolação de layout ou carregador GLTF desde o início.

A recomendação é uma inferência de adequação ao projeto, não resultado de benchmark. Foram consultados sites, documentação, licenças e fontes oficiais; Context7 para Embla, Motion e React Three Fiber; registro shadcn para carrossel; código de dois componentes Magic UI; demonstrações públicas de Paper Shaders e Magic UI. A documentação é atual à data desta consulta e precisa ser reconfirmada na adoção.

O frontend usa React 19, Next 15.5.26, CSS Modules e Base UI. Não possui Tailwind, Motion, Embla ou Three.js nas dependências consultadas. Não há configuração de registro shadcn no frontend. Já existem OverlayDialog, controles, tabs, LiquidLens e efeitos ópticos locais. Essa base deve ser reaproveitada antes de importar outro sistema visual.

## 2. O que cada integração resolve

| Tipo | Ajuda oferecida | Entra na página do visitante? |
| --- | --- | --- |
| MCP | Agente consulta documentação, busca exemplos ou opera ferramenta de criação. | Não por si. É ferramenta de desenvolvimento/autoria. |
| Skill | Instruções e boas práticas para o agente. | Não. Não substitui biblioteca, revisão ou testes. |
| Biblioteca | Executa movimento, carrossel, shader ou cena. | Sim, quando o recurso exige; carregar sob demanda. |
| Código de componente | Implementação adaptável ao produto, sujeita à licença de origem. | Sim, após revisão e integração. |
| Asset exportado | Modelo, textura, vídeo, imagem ou animação pronta. | Sim, pelo pipeline de mídia, com origem e licença registradas. |

Ter MCP não é critério suficiente de adoção. Um motor pequeno com boa API pode economizar mais trabalho que um catálogo com instalador e dependências incompatíveis. Uma conexão MCP documentada também não significa conexão disponível nesta sessão.

## 3. Candidatos prioritários

| Solução | Aplicação em Minha página | Licença e integração verificadas | Decisão proposta |
| --- | --- | --- | --- |
| [Embla Carousel](https://www.embla-carousel.com/) | B02/B06: swipe, arraste e navegação de carrossel. | Núcleo [MIT](https://raw.githubusercontent.com/davidjerleke/embla-carousel/v8.6.0/LICENSE); headless, aceita CSS próprio. Estável consultada: 8.6.0; 9 é RC. | Primeira candidata para carrossel com gestos; CSS scroll-snap basta para casos simples. Não importar o wrapper Tailwind do shadcn. |
| [Motion](https://motion.dev/) | Entrada/saída, layout, reordenação e gestos nos componentes React. | Núcleo [MIT](https://raw.githubusercontent.com/motiondivision/motion/main/LICENSE.md); [AI Kit com MCP e skill oficiais](https://motion.dev/docs/ai-kit). Documentação/boas práticas gratuitas; ferramentas e exemplos adicionais dependem de Motion+. | Candidata preferencial para movimento DOM avançado quando CSS/WAAPI não resolver bem. Não instalar por um fade. |
| [Paper Shaders](https://shaders.paper.design/) | Aurora, mesh, ondas, grão, retícula, vidro e metal em fundos decorativos. | [Apache-2.0](https://github.com/paper-design/shaders), com LICENSE/NOTICE; núcleo canvas e wrapper React. O repositório pede versão exata por mudanças incompatíveis em 0.0.x. | Primeiro spike de fundos procedurais; evitar escrever cada shader do zero. É shader 2D/WebGL, não editor de modelos 3D. |
| [Three.js](https://github.com/mrdoob/three.js), [React Three Fiber](https://r3f.docs.pmnd.rs/getting-started/introduction) e [Drei](https://github.com/pmndrs/drei) | B17, objetos, fundos com geometria, câmera, materiais, flutuação e partículas. | MIT nos projetos; Fiber 9 acompanha React 19. Drei oferece useGLTF, Bounds, Center, Environment, Stage e Float. Não escolher alpha por ser mais recente. | Comparar Three direto com Fiber 9 + helpers Drei usados de fato; model-viewer continua alternativa para objeto isolado. Escolher um caminho 3D, não três runtimes. |
| [Magic UI gratuito](https://magicui.design/) | Contornos luminosos, bento, efeitos em cards e textos. | [MIT](https://raw.githubusercontent.com/magicuidesign/magicui/main/LICENSE.md), [MCP documentado](https://magicui.design/docs/mcp); fontes geralmente usam Tailwind e algumas exigem Motion. | Aproveitar efeitos pequenos após adaptação a CSS Modules. O produto Pro tem [licença própria](https://pro.magicui.design/license); não estender MIT a ele. |
| [Poly Haven](https://polyhaven.com/license) e [Kenney](https://kenney.nl/assets/factory-kit) | Modelos, ambientes e texturas para biblioteca curada. | Acervo Poly Haven CC0 e pack Kenney consultado CC0; conferir cada asset/pack escolhido. | Evitam modelar todos os objetos. Importar apenas seleção otimizada, com poster, manifesto e aprovação visual. |

### 3.1 Exemplos de código realmente inspecionados

O registro de [Shine Border](https://magicui.design/r/shine-border.json) usa gradiente, máscara e animação CSS com utilitários Tailwind; não declara pacote adicional de runtime. É candidato a pequeno efeito local, com atribuição preservada e controles de intensidade/pausa.

O [Magic Card](https://magicui.design/r/magic-card.json) declara Motion e next-themes. Não justifica adicionar um provider global de tema: as cores devem vir do documento da página. Comparar o resultado com LiquidLens/efeitos locais; aproveitar somente se reduzir trabalho sem duplicar rastreamento do ponteiro e política de transparência.

O item `@shadcn/carousel`, consultado via MCP já disponível, aponta para embla-carousel-react. Isso confirma um padrão de integração, não autorização para executar instaladores. Controles existentes e CSS Modules oferecem encaixe melhor que copiar o wrapper inteiro.

## 4. Catálogos atraentes com condições adicionais

| Opção | O que oferece | Limite e decisão |
| --- | --- | --- |
| [React Bits](https://reactbits.dev/) | Fundos, textos, cursores, cards e efeitos; variantes com CSS; [registro/MCP](https://reactbits.dev/get-started/mcp). | A [licença atual](https://raw.githubusercontent.com/DavidHDev/react-bits/main/LICENSE.md) é MIT + Commons Clause. Permite aplicação comercial, mas restringe redistribuir componentes e certos serviços baseados nas ferramentas. Nosso catálogo configurável exige esclarecimento específico antes de reuso; transcrever para CSS Modules não remove a restrição. |
| [React Bits Pro](https://pro.reactbits.dev/docs/mcp) | Catálogo autenticado, MCP e ferramentas para agentes. | [Licença própria](https://pro.reactbits.dev/license): distingue interface de SaaS de biblioteca reutilizável. Não comprar nem tratar como autorização automática para alimentar um construtor de páginas. |
| [Aceternity UI](https://ui.aceternity.com/) | Cards 3D aparentes, spotlight, paralaxe, heros e blocos; [CLI/registro MCP](https://ui.aceternity.com/docs/cli). | React/Tailwind/Motion; [licença publicada](https://ui.aceternity.com/licence) contém restrições de redistribuição. Conferir componente e uso em catálogo editável antes de copiar. Referência visual secundária. |
| [Animate UI](https://github.com/imskyleen/animate-ui) | Primitivas e componentes animados React/Tailwind/Motion. | [MIT + Commons Clause](https://raw.githubusercontent.com/imskyleen/animate-ui/main/LICENSE.md). Não substituir Base UI nem presumir MIT irrestrita. MCP oficial específico não confirmado. |
| [Motion Primitives](https://github.com/ibelick/motion-primitives) | Textos, transições, cards e componentes React animados. | [MIT](https://raw.githubusercontent.com/ibelick/motion-primitives/main/LICENCE.md); Tailwind/Motion e API em evolução. Fonte secundária para padrões, sem incorporar outro design system. |
| [ShaderGradient](https://github.com/ruucm/shadergradient) | Gradientes em superfícies 3D com controle visual. | README declara MIT e compatibilidade React 19/Fiber 9; exige conjunto Three/Fiber/controles. Capturar licença do artefato exato antes de adoção. Alternativa a Paper quando geometria 3D acrescentar valor e Fiber já for escolhido. |
| [Anime.js](https://animejs.com/documentation/) | Timelines, SVG e animação via APIs web. | [Núcleo MIT](https://raw.githubusercontent.com/juliangarnier/anime/master/LICENSE.md). Alternativa a Motion se uma sequência concreta favorecer sua API; não adicionar ambos por catálogo. MCP oficial não confirmado. |
| [GSAP](https://github.com/greensock/GSAP) | Timeline, SVG e interações complexas. | Licença GreenSock própria; página oficial de termos ficou indisponível na consulta. Não declarar incompatível nem liberado para nosso builder sem verificar termos atuais. Não é a primeira escolha enquanto alternativas permissivas atendem. |
| [21st.dev Magic](https://www.21st.dev/magic) | Geração/descoberta de componentes para agentes. | Nenhuma ferramenta ativa encontrada nesta sessão; acesso à página não confirmou condições atuais. Não tratar código gerado como dependência auditada nem como licença unificada. Não é necessário para o plano. |

Essa triagem é técnica/comercial, não parecer jurídico. O gate se aplica à incorporação exata em um produto de criação de páginas; não significa que usar essas soluções em qualquer SaaS seja proibido. Priorizar fontes permissivas evita depender dessa ambiguidade para entregar o programa.

## 5. Autoria de cenas e integrações com agentes

| Ferramenta | Integração existente | Uso recomendado e limite |
| --- | --- | --- |
| [Spline](https://docs.spline.design/generate/spline-mcp-server) | MCP oficial remoto e local; [skill oficial](https://docs.spline.design/generate/spline-agent-skill) publicada. | Criar protótipos/cenas curadas. MCP edita o projeto de autoria; não implementa sozinho nosso renderer ou pipeline. [Export self-hosted](https://docs.spline.design/exporting-your-scene/web/exporting-as-self-hosted-project) depende das condições comerciais do fornecedor. Não tornar uma conta Spline requisito do visitante. |
| [Paper Desktop](https://paper.design/docs/mcp) | MCP oficial de canvas/design e exportação HTML/CSS/React; [download Windows](https://paper.design/downloads). | Autoria/protótipo opcional. É diferente do pacote Apache de shaders, que não exige o aplicativo. [Quotas do produto](https://paper.design/pricing) impedem prometer uso ilimitado gratuito. |
| [Blender MCP comunitário](https://github.com/ahujasid/mcp-for-blender) | Plugin/servidor de terceiro para criar e editar cenas e exportar modelos. | Não é integração oficial da Blender Foundation. Autoria opcional, com execução de Python e telemetria documentadas; avaliar isolamento e desativação de telemetria antes de qualquer instalação. Não é pré-requisito para usar Blender/exportar GLB manualmente. |
| [shadcn MCP](https://ui.shadcn.com/docs/mcp) | Consulta de registros/componentes já disponível na sessão. | Descoberta e leitura. Não executar init/add nem criar Tailwind/components.json só para acessar um efeito. |
| [skills.sh](https://skills.sh/) | Diretório de skills para agentes. | Descoberta, não selo de qualidade. Preferir skill oficial do mantenedor e ler origem/ações antes de instalar. As skills locais de animação e design já cobrem parte da necessidade. |

Motion, Spline e Paper têm integrações documentadas, mas nenhuma foi conectada por esta pesquisa. A busca nas ferramentas disponíveis não encontrou servidores ativos deles. Figma, Context7, Playwright e shadcn já oferecem recursos de consulta/autoria na sessão; não é necessário acrescentar outro aplicativo para começar.

## 6. Como transformar referências em opções reais do editor

| Família solicitada | Reuso mais útil | Parte própria que permanece |
| --- | --- | --- |
| Aurora, surreal, futuristic, cyberpunk | Paper Shaders; geometria/partículas Drei quando necessário. | Paletas, intensidade, poster, contraste, pausa e parâmetros permitidos. |
| Glass, clay, Y2K, maximalism | CSS, efeitos locais e pequenos efeitos Magic UI MIT. | Material coerente por tema, legibilidade, comportamento no toque e fallback. Clay não exige modelo 3D. |
| Pixel, retro, pop art, collage | CSS/SVG internos e assets licenciados; shaders de retícula/grão se agregarem valor. | Tipografia licenciada, composição e 20 fichas visuais distintas. |
| Minimal, Swiss, editorial, vector, handwritten, bohemian, graffiti, Victorian | Grid/tipografia/arte curada; sem runtime adicional por padrão. | Direção visual, hierarquia, responsividade e edição profissional. |
| Carrosséis, galerias e vitrines | Embla, OverlayDialog e controles existentes. | Dados canônicos, semântica, teclado, métricas e autorização. |
| Movimento de cards/textos/layout | CSS/WAAPI; Motion se necessário. | Contrato de sequência, controles rápidos/avançados, limites e estado persistido. |
| Objetos 3D prontos e próprios | Three/Fiber/Drei ou alternativa escolhida; assets CC0. | Pipeline GLB, poster, política de conteúdo e orçamento. |

Efeitos devem ser parâmetros tipados do documento, nunca componentes React serializados, URLs de scripts ou código remoto. Trocar a biblioteca de implementação não deve exigir reescrever os dados salvos. MCPs/skills continuam ferramentas internas, sem conexão com dados privados dos donos por padrão.

## 7. Avaliações inseridas no plano

1. **Tarefa 01:** ficha de adoção por candidato: origem, versão/commit, licença do pacote/código/asset, atribuições, dependências, manutenção, custo, requests e política de rede. Copiar código exige a mesma revisão que instalar pacote.
2. **Tarefas 08/09:** comparar efeitos locais com Shine Border; spike Paper para mesh/aurora/retícula. Não importar next-themes ou Tailwind. Medir conteúdo estático e efeito ativo, não somente a demo isolada.
3. **Tarefa 11:** Embla estável versus scroll-snap na mesma fixture; decidir pela necessidade de gestos/loop e custo. Manter foco/pausa/HTML sem JS sob responsabilidade do produto.
4. **Tarefa 14:** CSS/WAAPI versus Motion core para layout e entrada/saída. AI Kit oficial é ferramenta opcional; exemplos Motion+ não herdam automaticamente a licença MIT do core.
5. **Tarefa 15:** Three direto versus Fiber 9/Drei e model-viewer conforme a necessidade; três caminhos de comparação, um escolhido. Comparar cena curada a partir de assets CC0 com autoria Spline/Blender somente se isso poupar trabalho verificável.

Critério comum de saída: mesma composição, conteúdo e aparelho; registrar bytes comprimidos e carregados, dependências transitivas, requests, startup, memória, responsividade e frames. Testar Chrome/Android intermediário, Safari/iPhone, teclado/toque, reduced-motion, sem WebGL/JS, perda de contexto e troca repetida de tema. Não há números de desempenho medidos nesta pesquisa.

Paper e Three disputam o mesmo orçamento: **um canvas GPU ativo por página**, incluindo fundo e objeto. Se um objeto interativo assumir a GPU, usar poster do fundo e liberar/pausar o renderer anterior. A galeria de temas mostra thumbnails, não dezenas de canvases. DPR alvo máximo 1,5 e alvo 30 fps continuam hipóteses a validar; a configuração padrão de mesh consultada usa minPixelRatio 2 e precisa ser ajustada/medida. `speed: 0` congela movimento, mas ainda usa WebGL: fallback sem GPU precisa de imagem/CSS real.

Ambientes, fontes, decoders e imagens de demos não recebem a licença do motor automaticamente. Não depender de CDN externo implícito: hospedar somente arquivos permitidos, com manifesto e pipeline adequados. Registrar versão exata e avisos de terceiros; reavaliar licença antes de atualizações.

## 8. O que muda e o que foi verificado

O escopo funcional, os 20 estilos, os 18 componentes e a proposta de planos permanecem. Muda o caminho de execução: reusar motores e um acervo curado antes de desenvolver equivalentes. Nenhum catálogo pronto elimina autoria de temas, integração, acessibilidade, processamento, segurança ou validação em aparelhos.

Inspeção visual de referência: Paper Mesh Gradient e página de Shine Border abertas em navegador automatizado isolado. Capturas locais em `output/minha-pagina-reuse-2026-10-25/`; a captura de Paper foi examinada. Não houve integração no produto, profiling, teste do editor, verificação de toda animação dos catálogos, compra de licença, conexão de novo MCP ou execução de skill baixada. Fontes externas foram consultadas como material, sem enviar código privado.

Não estimar porcentagem de economia sem protótipo comparável. A revisão de licenças é uma fotografia desta data; registrar a licença do artefato efetivamente usado durante implementação.
