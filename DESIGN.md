---
name: Tem Link Aqui
description: Ondas e vidro na interface da plataforma, com a identidade navy e turquesa existente.
colors:
  brand-navy: "#0a192f"
  brand-turquoise: "#4af9eb"
  surface-page: "#0a192f"
  surface-raised: "#102c40d9"
  surface-subtle: "#b8fff014"
  surface-glass: "#102c40b8"
  surface-popup: "#102c40f5"
  text-primary: "#effbff"
  text-secondary: "#bad6e2"
  border-default: "#b4e9ed42"
  action-primary-bg: "#4af9eb"
  action-primary-hover: "#83fff3"
  primary-ink: "#0a192f"
  color-link: "#a3fff3"
  focus-ring: "#4af9eb"
  glass-border: "#c6fff052"
  field-background: "#071b2b80"
  field-border: "#b7e8ee66"
  select-selected-background: "#4af9eb24"
  status-success-text: "#8df0c8"
  status-success-bg: "#103e36"
  status-success-border: "#80eac966"
  status-error-text: "#ffb8b2"
  status-error-bg: "#452c39"
  status-error-border: "#ffa6a366"
  status-warning-text: "#ffe0a3"
  status-warning-bg: "#423d2f"
  status-warning-border: "#eaca8266"
typography:
  display:
    fontFamily: "Outfit, sans-serif"
    fontSize: "clamp(20px, 5.6vw, 64px)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Outfit, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.15
  title:
    fontFamily: "Outfit, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.15
  body:
    fontFamily: '"Source Sans 3", sans-serif'
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: '"Source Sans 3", sans-serif'
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.55
rounded:
  sm: "0.375rem"
  md: "0.75rem"
  lg: "1rem"
spacing:
  space-1: "4px"
  space-2: "8px"
  space-3: "12px"
  space-4: "16px"
  space-6: "24px"
  space-8: "32px"
  space-12: "48px"
  space-16: "64px"
components:
  button-primary:
    backgroundColor: "{colors.action-primary-bg}"
    textColor: "{colors.primary-ink}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
  button-primary-hover:
    backgroundColor: "{colors.action-primary-hover}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
  button-danger:
    backgroundColor: "{colors.status-error-bg}"
    textColor: "{colors.status-error-text}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
  input:
    backgroundColor: "{colors.field-background}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "12px"
  badge:
    backgroundColor: "{colors.surface-page}"
    textColor: "{colors.text-secondary}"
    rounded: "999px"
    padding: "2px 8px 2px 6px"
  link-card:
    backgroundColor: "{colors.surface-glass}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "0"
  sidebar-link:
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  select:
    backgroundColor: "{colors.field-background}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "12px"
  dialog:
    backgroundColor: "{colors.surface-popup}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "0"
---

# Design System: Tem Link Aqui

## Overview

**Creative North Star: "Ondas"**

A autoridade visual aprovada é a preview `/dev/homes/ondas` e seu detalhe. Em 23/10/2026, o usuário rejeitou a adaptação entregue no frontend real e exigiu reutilizar a composição e o Liquid Glass dessa preview, retirar ícones coloridos e o botão “Pausar ondas”. A aprovação da preview não significa aprovação da implementação anterior de produção. A autorização para executar a correção permanece, sem novo fluxo de aprovação.

**Migração e validação de paridade em andamento:** os valores e exemplos abaixo registram a implementação anterior e não substituem a preview como referência. A correção atual compartilha `ondas-catalog.module.css` e `components/ui/liquid-lens` entre preview e produção; sua paridade visual ainda depende de inspeção em navegador. O alcance real, testes executados e pendências estão em [ondas-preview-parity.md](docs/superpowers/2026-10-23-ondas-preview-parity.md).

O material se adapta à tarefa. Catálogo e detalhes expõem os links e os anexos reais dos publicadores. Painel e administração preservam densidade, tabelas, formulários e leitura, com atmosfera discreta e sem WebGL. Páginas públicas personalizadas, campanhas, mídia kit e suas prévias mantêm as cores, fontes e composição escolhidas pelo proprietário.

Este documento registra a implementação observada, não uma certificação das 95 rotas. Tokens executáveis permanecem em [primitives.css](frontend/src/styles/primitives.css) e [tokens.css](frontend/src/styles/tokens.css). O [contrato da migração](docs/superpowers/specs/2026-10-23-ondas-platform-design.md), a [matriz de rotas](docs/superpowers/ondas-route-matrix.csv) e os relatórios de validação distinguem implementação, navegação, revisão visual e jornadas verificadas. O registro anterior está preservado em [ondas-design-before.md](docs/superpowers/evidence/ondas-design-before.md).

**Key Characteristics:**

- Azul-marinho como fundo; turquesa para ação e realce; texto claro com papéis semânticos próprios.
- Outfit em títulos e Source Sans 3 em leitura e controles.
- Vidro por transparência controlada, luz nas bordas, sombra e conteúdo nítido.
- Ondas decorativas com pausa; densidade e movimento discretos nas ferramentas.
- Anexos opcionais e moderados, sem imagem fictícia ou espaço reservado quando ausentes.
- Personalização do publicador preservada fora do tema da plataforma.

## Colors

### Primary

- **Azul-marinho de marca** (`brand-navy`): pigmento da identidade e base da página. O token de marca continua literal; não usar esse tom escuro como cor de texto sobre os painéis escuros.
- **Turquesa de marca** (`brand-turquoise`): acento de identidade, ação primária e foco. A ação tem texto navy (`primary-ink`) e hover próprio (`action-primary-hover`).
- **Link luminoso** (`color-link`): links e elementos gráficos que precisam se distinguir da superfície escura. Não alterar a marca para resolver contraste de texto.

### Neutral

- **Página** (`surface-page`): base opaca sobre a qual a atmosfera é desenhada.
- **Superfície elevada** (`surface-raised`): contenção de conteúdo e controles existentes.
- **Vidro** (`surface-glass`): material de cards, cabeçalho, rodapé e navegação da plataforma.
- **Popup** (`surface-popup`): camada mais opaca para opções, calendários e diálogos, com prioridade de leitura.
- **Superfície sutil** (`surface-subtle`): realce secundário e hover, sem competir com a ação primária.
- **Texto principal e secundário** (`text-primary`, `text-secondary`): conteúdo e metadados; ambos permanecem nítidos sobre o vidro.
- **Bordas e campos** (`border-default`, `glass-border`, `field-background`, `field-border`): divisão, reflexo e controle de entrada têm papéis distintos.

Sucesso, erro e aviso usam os pares semânticos de texto, fundo e borda do frontmatter. Estado continua explícito em texto e semântica; cor e brilho não substituem rótulos. O estado selecionado usa `select-selected-background` junto de texto e indicador.

Em transparência reduzida, o código troca superfícies por fundos opacos e zera o blur. Sem suporte a backdrop-filter, campos e superfícies principais recebem fundos opacos. Essas variantes são fallbacks de material, não um tema claro global. As rampas do sidecar são amostras calculadas para o painel de documentação, não novos tokens de produto.

## Typography

**Display Font:** Outfit, sans-serif. **Body Font:** Source Sans 3, sans-serif. Ambas são carregadas por `next/font` no layout raiz. O alias legado serif aponta para Outfit; não introduz uma terceira família.

### Hierarchy

- **Display:** composição da home atual, com tamanho fluido, peso 600 e espaçamento negativo. A decisão de título central em uma linha pertence à home, não a todos os h1.
- **Headline:** h1 de base; detalhes e aquisição podem ter escala local conforme a composição.
- **Title:** h2 global e títulos de cards; nomes de links têm entrelinha própria e quebra de palavras longas.
- **Body:** leitura e controles, com medida compartilhada de 65ch quando aplicável.
- **Label:** identificação visível de campo; o placeholder é apoio, não substituto do rótulo acessível.

Descrição truncada serve à comparação no card. O detalhe mantém a descrição completa e suas quebras de linha. Não reduzir o tamanho de toda a interface para acomodar conteúdo longo; usar quebra, grid fluido e rolagem localizada onde a tarefa exigir.

## Layout

A escala `space-*` mantém o ritmo compartilhado. Os containers existentes são formulário (`28rem`), leitura (`65ch`), catálogo (`80rem`) e workspace (`90rem`). O `main` de base tem limite de `48rem`; composições específicas o ampliam. Isso descreve responsabilidades reais, não uma largura única para todas as telas.

A home usa limite local de `86rem`, hero centralizado sem placa de fundo e busca com largura máxima de `760px`. Facetas com ícones, filtros e catálogo usam dados reais. A estratégia da galeria e da home está no [brief da superfície](.impeccable/surfaces/home-directions.md); a composição da home não é o layout obrigatório de administração ou aquisição.

O detalhe admite capa grande ao lado do resumo acima de `850px`; no mobile, as regiões empilham. Sem imagem, ou após falha ao carregar, não existe uma coluna vazia. Cabeçalho e navegação alternam para drawer abaixo de `64rem`; formulários e grids locais preservam seus pontos de quebra. Tabelas largas mantêm rolagem própria, sem expandir a página inteira.

Painel e administração compartilham material, espaçamento e hierarquia, preservando os estados operacionais e as capacidades reais. Páginas personalizadas delimitam seus próprios tokens e color-scheme. Não projetar sobre elas o fundo, as ondas ou o tema escuro da plataforma.

## Elevation & Depth

O vidro combina superfície tonal, borda iluminada e sombra compartilhada. A lente compartilhada usa blur de `0,65px` e saturação em CSS, sem filtros SVG, mapas de deslocamento ou acompanhamento do ponteiro; textos e imagens permanecem nítidos. `--shadow` aponta para `--glass-shadow`. A refração RGB permanece no componente próprio da galeria experimental, sem custo por controle na plataforma.

A sombra de vidro implementada é `inset 0 1px 0 #e4fff382, inset 0 -1px 0 #abfff029, 0 16px 36px #000c1c40`. Diálogos acrescentam profundidade própria e backdrop. Menus e calendários usam a superfície mais opaca para não perder leitura quando sobrepostos a conteúdo.

A atmosfera é decorativa e não participa da navegação. No shell da plataforma, o canvas compartilhado fica pausado: desenha a composição estática na montagem, no redimensionamento e na recuperação do contexto, sem animação contínua. Mantém solicitação de GPU de baixo consumo, DPR limitado a `1.25`, gradiente e linhas SVG estáticas como fallback. A mudança de 26/10/2026 reduz o custo observado ao rolar a home; evidências e limites estão em `docs/pesquisas/2026-10-26-scroll-home-correcao.md`.

A galeria experimental conserva as ondas animadas, a refração e o botão de pausa com estado acessível. Na plataforma, `prefers-reduced-motion` mantém o fundo estático e remove transições dos componentes que o tratam. Transparência reduzida oculta a decoração. Pausa e fallbacks não alteram dados ou ações da tela. O custo real precisa ser medido no dispositivo; limites de renderização não são um benchmark de desempenho.

## Shapes

Controles básicos usam o raio pequeno; Input, Select e navegação usam o médio; cards de catálogo, painéis e diálogos usam cantos mais amplos. Chips usam cápsula. A busca da home tem raio local de `20px`; isso não cria um novo degrau global.

Na capa do card, os cantos superiores acompanham a casca. A imagem encosta no corpo textual: não há moldura interna, padding ao redor da foto nem texto sobre a imagem. Sem imagem, a casca continua completa e o corpo começa no topo. Ícones anexados são imagens pequenas com cantos próprios; símbolos semânticos continuam vindo do sistema existente.

## Components

### Buttons

Primário usa turquesa com texto navy. Secondary e ghost mantêm fundo transparente e borda; o hover utiliza a borda/superfície compartilhada. Danger usa o par de erro escuro, sem pastel sob texto claro. Botões têm altura mínima de `44px`, peso 600 e foco global de `3px` com afastamento de `3px`. Loading preserva a dimensão do conteúdo; spinner tem alternativa estática para movimento reduzido. As variantes atuais não exigem uma nova dependência.

### Chips

Badges organizam rede, nicho e estado com cápsula, texto compacto e borda. Filtros clicáveis continuam distintos de metadados estáticos. Patrocinado mantém marcação textual explícita e tratamento de superfície próprio; não comunicar publicidade somente com brilho. Ícones preservam o significado existente de cada contexto.

### Cards / Containers

Card de catálogo une capa opcional e corpo textual. A capa ocupa o topo em proporção `16:9`, com texto abaixo; ausente ou com erro, a região inteira é omitida. O corpo usa `24px`, reduzidos para `16px` no mobile estreito. Nome, descrição truncada, rede/nicho e contagens reais compõem a hierarquia; não inventar membros ou visualizações.

O link do card cobre sua área, preservando URL e `surfaceToken`; favorito e ações permanecem independentes, sem links aninhados. Hover eleva o card em `3px` apenas quando o ambiente admite hover e movimento; foco evidencia o destino. Patrocinado usa borda e gradiente turquesa distintos, além do rótulo. Cards administrativos estáticos não recebem navegação ou hover por imitação do catálogo.

### Inputs / Fields

Input tem altura mínima de `48px`, fundo de campo, borda semântica e raio médio. Label, dica e erro permanecem associados ao controle. Erro é texto e contorno; disabled mantém semântica nativa. A busca da home tem altura de `64px`, ícone, sugestões reais e rótulo acessível, com sua composição própria.

Select usa vidro tanto no trigger quanto no popup, com fundo mais opaco nas opções. Selecionado e destacado possuem estados distintos; o popup se ancora ao controle e respeita a altura disponível. Calendário segue a mesma família de material. Portais, setas, Escape, retorno de foco e diálogo pertencem aos componentes reais; os snippets do sidecar mostram somente a aparência e não substituem Base UI ou os testes de interação.

### Navigation

Cabeçalho, drawer, lateral e rodapé mantêm a navegação real. A marca clara do shell usa a geometria existente sobre o fundo escuro; logo continua levando à home. Alvos têm altura mínima de `44px`. A lateral usa texto secundário e superfície sutil no hover; o item atual mantém contraste com o fundo claro local, traço interno e `aria-current`. Não confundir o pigmento navy desse estado claro com texto navy sobre painéis escuros.

### Dialogs, feedback and loading

Dialog e drawer usam `surface-popup`, borda de vidro e backdrop. A largura e o padding respondem ao tamanho da tela; rolagem e altura preservam o acesso às ações. Feedback usa pares semânticos com mensagem explícita. Skeletons mantêm a estrutura da jornada sem oferecer ações operacionais durante a carga. Acabamento visual não modifica confirmação, autorização, suporte ou cobrança.

### Link details and attachments

Detalhe apresenta capa grande opcional e resumo em vidro, com acesso ao destino, favorito e denúncia preservados. A seção **Sobre** reaproveita a descrição real aprovada, com nome adequado ao tipo de link; não existe um segundo campo textual concorrente. A imagem não recebe legenda de mock.

Ícone e capa são anexos opcionais ligados ao próprio Link/tenant. A interface permite enviar, substituir e remover, mostra pendência/rejeição e motivo privado, e preserva a mídia aprovada enquanto uma substituição aguarda análise. Análise da mídia é independente da aprovação textual; o catálogo público recebe somente anexos aprovados. Não buscar imagens remotas para simular anexos ausentes. Limites e validações ficam no contrato de mídia e no backend, sem duplicar regras comerciais na apresentação.

## Do's and Don'ts

### Do:

- **Do** reutilizar tokens semânticos e componentes existentes antes de criar novos estilos.
- **Do** manter texto nítido, foco visível, rótulos associados e estados explícitos sobre o vidro.
- **Do** preservar pausa, movimento reduzido, transparência reduzida e fallback sem GPU ou backdrop-filter.
- **Do** omitir por completo a região de imagem ausente ou com falha, mantendo as ações independentes do card.
- **Do** adaptar densidade à tarefa e respeitar a paleta e o layout das publicações personalizadas.
- **Do** registrar verificações por rota e estado; código tematizado não equivale a jornada validada.

### Don't:

- **Don't** usar navy como texto sobre superfícies escuras nem pastel de status sob texto claro.
- **Don't** colocar texto sobre a capa do card ou inserir fotografia fictícia quando não houver anexo.
- **Don't** substituir conteúdo, publicidade identificada ou estados reais por efeitos e números inventados.
- **Don't** vincular aprovação de mídia à aprovação textual nem mostrar proposta pendente ao público.
- **Don't** promover outras variantes da galeria a regras globais sem decisão explícita.
- **Don't** tratar esta documentação ou os fallbacks implementados como validação completa de acessibilidade, desempenho ou produção.
