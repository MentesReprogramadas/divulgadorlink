# Liquid Glass com refração — 23/10/2026

Registro histórico: a solicitação seguinte separa fotografias e conteúdo. Estado atual em [Ondas: fotografia separada](ondas-separated-layout.md).

O usuário considerou o material anterior “um card azul apenas” e pediu aprofundar Liquid Glass, pesquisando bibliotecas, sites e repositórios. A rota continua `/dev/homes/ondas`, com detalhe em `/dev/homes/ondas/link/[slug]`. Não houve alteração da home pública, do cabeçalho compartilhado ou de regras de produto.

## Pesquisa dirigida

Foram lidos documentos e fontes primárias. As demos de rdev e Meapri também foram abertas e capturadas no Playwright MCP; as capturas foram inspecionadas. A demo de Meapri teve um erro de console e é referência visual, não validação de qualidade do pacote. Context7 foi consultado para a documentação de rdev. Nenhuma biblioteca foi instalada.

| Referência | Técnica / restrição observada | Uso nesta revisão |
| --- | --- | --- |
| [rdev/liquid-glass-react](https://github.com/rdev/liquid-glass-react) · [demo](https://liquid-glass.maxrovensky.com/) | Refração SVG, dispersão RGB, fosco e elasticidade. O README documenta ausência de deslocamento em Safari/Firefox. React/React DOM são peers ≥18; licença [MIT](https://raw.githubusercontent.com/rdev/liquid-glass-react/master/LICENSE), Max Rovensky | Separar refração do fosco e manter tipografia fora do filtro; referência de comportamento, sem copiar código ou instalar pacote |
| [Shuding/liquid-glass](https://github.com/shuding/liquid-glass) | Shader de coordenadas executado para gerar mapa RG; filtro SVG desloca o backdrop. Fonte e [MIT](https://raw.githubusercontent.com/shuding/liquid-glass/main/LICENSE), Shu Ding, consultados | Modelo conceitual de mapa geométrico; componente local com ciclo de vida React, sem executar o script de console do repositório |
| [Kube: Liquid Glass in the Browser](https://kube.io/blog/liquid-glass-css-svg/) | Explica normal, refração, curvatura e reflexo especular; a própria demo limita SVG backdrop a Chrome | Distinguir transmissão, desvio e reflexo; não afirmar simulação física completa |
| [Meapri/liquid-glass-web](https://github.com/Meapri/liquid-glass-web) · [demo](https://meapri.github.io/liquid-glass-web/) | Mapas geométricos, canais separados, borda especular, perfis por superfície; licença [MIT](https://raw.githubusercontent.com/Meapri/liquid-glass-web/main/LICENSE) | Escala de refração limitada para controles menores, três canais e baixo fosco; não adotar o motor inteiro |
| [Aceternity: Liquid Glass](https://ui.aceternity.com/components/liquid-glass) | Borda curva, dispersão e fallback fosco; transparência reduzida fica opaca; SVG backdrop é Chromium | Mesma estratégia de degradação, implementação local sem Tailwind ou shadcn |
| [React Bits: Glass Surface](https://reactbits.dev/components/glass-surface) | Superfície que dobra o fundo; variantes TypeScript/CSS disponíveis | Confirmar uso do material em contêineres reais, mantendo a stack local |
| [Nyx: Apple Glass Effect](https://nyxui.com/components/apple-glass-effect) | Tint, brilho especular e fundos fotográficos; documentação descreve camadas CSS e Tailwind | Fotografia deve permanecer visível sob a superfície; sem importar infraestrutura |
| [Simple Liquid Glass](https://github.com/lucaperullo/simple-liquid-glass) | Declara renderização WebGL para Safari/iOS e captura de cena; cenas podem usar snapshots, fontes e orçamento de memória. README declara MIT | Alternativa estudada; não adicionada, pois a fatia não precisa de captura de DOM ou outro motor WebGL |
| [cocolayuan/liquid-glass](https://github.com/cocolayuan/liquid-glass) | Declara refração entre engines por clone alinhado da cena e filtro normal no clone | Alternativa estudada, sem copiar nem clonar DOM. Licença não confirmada nesta consulta; não incorporado |
| [Magic UI: Shine Border](https://magicui.design/docs/components/shine-border) | Iluminação da borda | Reflexos localizados; não usar brilho contínuo em todos os elementos |
| [Fancy: Gooey SVG Filter](https://www.fancycomponents.dev/docs/components/filter/gooey-svg-filter) | Fusão de formas via filtro; suporte limitado em Safari | Gooey não resolve transmissão/refração por si só; não misturar o filtro sobre a tipografia |

Os arquivos MIT consultados permitem uso e distribuição sob suas condições de preservação dos avisos. Não houve cópia desses componentes para o produto. A implementação local e a matemática de coordenadas foram escritas para esta fatia; os links acima registram influência e alternativas. Nenhum código privado, segredo ou dado de usuário foi enviado para pesquisa.

## O que mudou

| Before | After | Why |
| --- | --- | --- |
| Painel azul com opacidade próxima de 94% | Tint escuro de baixa opacidade sobre a própria fotografia | O conteúdo atrás do vidro passa a ser visível |
| Blur de 23–28px como efeito principal | Fosco de 0,65px após lente SVG; fallback de 7px | Preservar os detalhes da fotografia e tornar a borda refrativa perceptível |
| Foto só na parte superior do card | Fotografia de fundo atravessa o card inteiro e o painel inferior | Dar ao vidro algo concreto para refratar |
| Detalhe com resumo sobre fundo vazio | Capa contínua atrás do resumo | A lente mantém continuidade de imagem nos dois lados da borda |
| Borda de cor fixa | Reflexo especular direcional e canais RGB deslocados em escalas próximas | Expressar espessura e dispersão sem distorcer letras |

Busca, card de capa, favoritos circulares, painéis dos nove cards, resumo do detalhe e ficha de informações recebem a lente. Nichos, rede, categoria, favoritos e patrocinado continuam distintos. A sequência de conteúdo e os nove dados fictícios foram preservados.

## Implementação

- `liquid-optics.ts`: mapa de deslocamento calculado pelas normais de um retângulo arredondado. Centro e regiões fora da forma permanecem neutros; a curvatura se concentra na borda e amostra para dentro da lente. O mapa recebe suavização SVG de 0,6px antes dos deslocamentos, para manter continuidade na fotografia.
- `liquid-lens.tsx`: camada decorativa reutilizável, sem filtrar seus irmãos de conteúdo. `useId` mantém ids compatíveis com SSR. `ResizeObserver` atualiza a geometria; textura limitada a 320px no maior lado; cache limitado a 32 mapas. A API local tem somente `radius`.
- `liquid-lens.module.css`: transmissão, tint, reflexos e borda; ponteiro muda somente a luz. Há um RAF solicitado por movimento, cancelado na saída/cleanup; nenhum loop permanente por lente.
- `ondas-preview.module.css`: composição fotográfica e superfícies locais. As ondas usam o renderer WebGL já existente; não foi adicionado outro contexto WebGL.

O SVG usa `feImage` para o mapa e três `feDisplacementMap`/matrizes de cor, reunidos com blend screen. A escala de referência é `min(22px, menor dimensão × 0,25)`; os canais vermelho/verde/azul usam multiplicadores 1 / 1,045 / 1,09. Esse limite e a suavização do mapa substituem a intensidade anterior, que dobrava a imagem em faixas. Não há ray tracing, captura de tela, clone de DOM ou cópia da foto em canvas. O canvas 2D gera apenas coordenadas matemáticas, não lê pixels de mídia externa.

A etiqueta sobre a foto do hero usa tint local `#020c1499`, mantendo a fotografia visível com base escura para o texto. Esse ajuste de contraste não aumenta a opacidade dos outros painéis nem cria um token global.

## Compatibilidade e limites

O caminho de refração é habilitado conservadoramente para user agents Chromium com backdrop-filter. Esta verificação não equivale a um teste físico de todos os navegadores. Safari/Firefox e ambientes sem mapa 2D ficam com vidro CSS fosco; sem backdrop-filter há superfície opaca. `prefers-reduced-transparency` remove refração/transparência. `prefers-reduced-motion`, toque e pausa desativam luz por ponteiro; as lentes estáticas permanecem, e as ondas já respeitam pausa/reduced-motion.

A refração desloca pixels efetivamente, mas é uma aproximação óptica 2D. Não é reprodução nativa do material da Apple. Três passes SVG têm custo de composição; não foi medido FPS, energia ou desempenho em aparelho físico. Nenhuma dependência, lockfile ou CSS global foi alterado nesta revisão.

## Evidências

Capturas em `.impeccable/review/ondas-refraction/`: home, detalhe e título longo, em 1440×1080, 390×844 emulado e 1280×720 (viewport observado do usuário). São nove capturas completas e nove do primeiro viewport, com fotografias locais determinísticas, fontes carregadas e reduced-motion. Capturas anteriores em `.impeccable/review/ondas/` e `output/ondas-glass-evidence/card-before-refraction.png` permitem comparação. O registro de proveniência cobre 33 imagens raster, sem entradas ausentes.

Novos testes cobrem geometria/limite de textura, alteração dos pixels ao desligar somente os deslocamentos SVG, tipografia sem filtro, resize, falha de canvas 2D e preferência por transparência reduzida. As capturas A/B ficam nos resultados da suíte `ondas-preview.spec.ts`.

Uma revisão independente abriu as 18 capturas e pediu duas correções: continuidade da refração e contraste da etiqueta sobre a foto. A rodada corrigida foi inspecionada e os dois achados foram considerados resolvidos. A etiqueta mediu 6,69–11,38:1 nas mesmas amostras desktop; esse resultado não certifica todas as combinações de imagem/texto. A disposição da revisão se limita a esses achados. O detector de violações foi executado uma vez e retornou lista vazia; isso não substitui a inspeção real.

Lint, typecheck e build finais passaram. O build foi isolado, preservando o runtime de revisão copiado em `output/home-gallery-runtime-3013-copy-20261023`, na porta 3013. Os 566 testes unitários (163 arquivos) passaram antes da última correção SVG/CSS; os três casos de geometria pura foram repetidos e passaram. Após a correção e a atualização das goldens, a comparação final sem atualização passou: 14 E2E de Ondas em 49s e quatro E2E da galeria/movimento em 18,1s. Não se declarou nova execução da suíte unitária completa após a última correção SVG/CSS.

A inspeção real pelo Playwright MCP confirmou 21 lentes na home, oito no detalhe e 13 fotos sem falha, sem erros de renderização da funcionalidade. O navegador interno foi atualizado e marcado como entrega. No contexto isolado, recusar cookies encontrou resposta 500 no endpoint compartilhado `/bff/v1/analytics/consent`, pois a API de demonstração na porta 4098 não estava ativa; o banner foi ocultado localmente. Esse é um limite do runtime mock, não atribuído ao vidro. Consentimento, servidor e regras de produto não foram alterados nesta revisão visual.

Reversão da intensificação: retirar LiquidLens dos componentes de Ondas e restaurar seus estilos da versão inicial; as rotas, dados, favoritos e regras comerciais não precisam ser substituídos. Não fazer reset do worktree compartilhado.
