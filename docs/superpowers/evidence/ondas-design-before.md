---
name: Tem Link Aqui
description: Identidade compartilhada observada no catálogo e nas áreas de conta.
colors:
  brand-navy: "#0a192f"
  brand-navy-hover: "#193655"
  brand-turquoise: "#4af9eb"
  surface-page: "#f6f8fb"
  surface-raised: "#ffffff"
  surface-subtle: "#edf1f6"
  text-primary: "#142339"
  text-secondary: "#5c6b7f"
  border-default: "#dce3ec"
  focus-ring: "#146dca"
  status-success-text: "#0b684b"
  status-success-hover: "#07513a"
  status-error-text: "#a32e28"
typography:
  display:
    fontFamily: "Outfit, sans-serif"
    fontSize: "clamp(2rem, 3vw, 2.5rem)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.03em"
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
    backgroundColor: "{colors.brand-navy}"
    textColor: "{colors.surface-raised}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
  button-primary-hover:
    backgroundColor: "{colors.brand-navy-hover}"
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
    backgroundColor: "#fff3f1"
    textColor: "{colors.status-error-text}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
  input:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "12px"
  badge:
    backgroundColor: "{colors.surface-page}"
    textColor: "{colors.text-secondary}"
    rounded: "999px"
    padding: "2px 8px 2px 6px"
  link-card:
    backgroundColor: "{colors.surface-raised}"
    rounded: "{rounded.md}"
    padding: "24px"
  sidebar-link:
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
---

# Design System: Tem Link Aqui

## Overview

Registro extraído da implementação compartilhada em 22/10/2026. A identidade usa azul-marinho, turquesa, superfícies claras e duas famílias tipográficas. Não há metáfora criativa, atmosfera nova ou direção estética final aprovada para as homes experimentais.

Este arquivo é uma projeção portátil dos estilos atuais. Os valores executáveis continuam em `frontend/src/styles/primitives.css` e `tokens.css`; a fonte de verdade das decisões e de sua evolução é [design-system.md](docs/frontend-profissional/design-system.md), junto do código atual. Divergências devem ser verificadas nessas fontes antes de alterar regras.

**Key Characteristics:**

- Identidade navy/turquesa preservada nos componentes compartilhados.
- Outfit em títulos; Source Sans 3 em texto e controles.
- Hierarquia por tipografia, bordas e superfícies claras.
- Estados de foco, erro e carregamento explícitos.

## Colors

### Primary

- **Azul-marinho de marca** (`brand-navy`): identidade, links e fundo da ação primária; `brand-navy-hover` responde ao hover.
- **Turquesa de marca** (`brand-turquoise`): acento de identidade e realce do catálogo. Não substitui a semântica de sucesso.

### Neutral

- **Superfície da página** (`surface-page`): fundo global frio e claro.
- **Superfície elevada** (`surface-raised`): campos e cards; também é o texto da ação primária.
- **Superfície sutil** (`surface-subtle`): apoio e hover da navegação lateral.
- **Texto principal e secundário** (`text-primary`, `text-secondary`): conteúdo e metadados, respectivamente.
- **Borda padrão** (`border-default`): divisão e contorno dos componentes compartilhados.

Foco, sucesso e erro usam seus tokens semânticos próprios. Esses estados continuam exigindo texto e semântica acessível; o registro da paleta não certifica contraste em toda combinação. As rampas do sidecar são amostras calculadas para o painel, não novos tokens de produto.

## Typography

**Display Font:** Outfit, sans-serif. **Body Font:** Source Sans 3, sans-serif. Ambas são carregadas por `next/font` no layout raiz. O alias legado de fonte serifada aponta para Outfit; ele não comprova uma terceira família global.

### Hierarchy

- **Display:** título de entrada do catálogo; a composição mobile tem ajuste local observado em `catalog.css`.
- **Headline:** h1 global; páginas podem compor títulos específicos sem alterar o token compartilhado.
- **Title:** h2 global e títulos de cards.
- **Body:** leitura e controles; medida de leitura existente (`65ch`).
- **Label:** rótulos associados aos campos, com peso maior para distinguir a função.

Os papéis acima nomeiam usos observados, não uma migração para outro sistema tipográfico.

## Layout

O ritmo compartilhado usa a escala `space-*` do frontmatter. A folha de fundamentos mantém um `main` padrão limitado a `48rem`, com padding superior de `32px`, lateral de `24px` e inferior de `48px`. Esse padrão tem composições específicas por rota; não aplicá-lo como limite de todas as telas.

Os containers existentes incluem formulário (`28rem`), leitura (`65ch`), catálogo (`80rem`) e workspace (`90rem`). Os cards de gestão usam grids com `minmax(0, 1fr)` e gap da escala; a lista de links do painel passa de duas colunas para uma abaixo de `720px`. Formulários de duas colunas passam para uma abaixo de `768px`. Esses pontos descrevem o código, não uma única grade obrigatória para o produto.

A estratégia de cada superfície fica em [.impeccable/surfaces/home-directions.md](.impeccable/surfaces/home-directions.md). Catálogo de uso funcional: modo Operate. Galeria interna de alternativas: modo Experience. Uma composição experimental não altera o contrato da home pública.

## Elevation & Depth

O sistema combina fundos claros, bordas e baixa elevação. A sombra compartilhada (`--shadow`) aparece em cards genéricos e sugestões; cards de gestão usam borda sem sombra obrigatória. O catálogo também tem elevação por hover/foco com movimento breve, descrita no sidecar. Diálogos têm elevação e backdrop próprios.

Liquid Glass e os materiais da galeria são hipóteses por superfície. Não foram incorporados à paleta, aos tokens de profundidade ou às regras globais deste documento.

## Shapes

Os raios compartilhados têm três degraus reais: controles básicos usam `sm`, Input e cards de gestão usam `md`, e `lg` está disponível nas fundações. Chips usam cápsula (`999px`). Há componentes legados com cantos locais; este registro não os normaliza silenciosamente.

## Components

### Buttons

Botões e links de ação compartilham forma, peso e espaçamento. Altura mínima de botão: `44px`. Primário usa navy e texto claro; secondary e ghost atualmente compartilham fundo transparente e borda. Danger usa fundo vermelho claro e texto de erro. O hover respeita disabled; foco usa contorno global. Loading preserva conteúdo e dimensões, com spinner sobreposto. O spinner tem fallback de movimento reduzido.

### Chips

Badge organiza metadados com cápsula, borda e texto compacto. Existem variantes semânticas por assunto, rede, patrocinado e estado; manter a identificação textual de publicidade. As cores dessas variantes são locais ao componente, sem substituir os tokens globais de marca.

### Cards / Containers

Cards de gestão usam superfície clara, borda, raio médio e padding da escala. O card genérico legado usa raio pequeno, padding menor e sombra compartilhada. Não presumir que todo card precisa de hover: apenas elementos com interação aplicável recebem resposta.

### Inputs / Fields

O Input compartilhado usa raio médio e altura mínima de `48px`. A base global de field usa raio pequeno; TextArea e outros controles preservam seu contrato atual. Borda do campo (`#a4b2c4`) muda no hover e no foco. Erro troca o contorno e tem mensagem associada. Field associa label, dica e erro ao controle; required não depende apenas da cor. Disabled reduz opacidade e preserva a semântica nativa.

### Navigation

SidebarLink tem alvo mínimo de `44px`, raio médio e texto secundário. Hover usa superfície sutil; item atual usa navy, fundo local claro e traço lateral interno, junto de `aria-current`. O cabeçalho e a navegação compartilhados continuam sendo compostos pelas rotas existentes.

## Do's and Don'ts

### Do:

- **Do** reutilizar os tokens e os componentes compartilhados antes de criar novos estilos.
- **Do** manter foco visível, labels associados, estados legíveis e alternativas para movimento reduzido.
- **Do** confirmar decisões em código e em `docs/frontend-profissional/design-system.md` antes de mudar o contrato visual.
- **Do** manter a estratégia experimental no brief da superfície correspondente.

### Don't:

- **Don't** apresentar uma home experimental, metáfora ou direção como aprovada sem decisão do usuário.
- **Don't** promover paletas, materiais ou composições da galeria a tokens globais por consequência desta exploração.
- **Don't** usar cor ou efeito visual para substituir informação, estado ou identificação de patrocinado.
- **Don't** tratar esta extração de código como inspeção visual completa ou certificação de acessibilidade.
