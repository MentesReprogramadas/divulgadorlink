# Ondas — fundações do material aprovado

Continuação de 23/10/2026 na branch `codex/roadmap-f37-testes`, após a orientação explícita para preservar a aparência da preview Ondas e remover o botão de pausa do cabeçalho.

## Fonte única

`components/ui/liquid-lens.tsx`, `liquid-lens.module.css` e `liquid-optics.ts` foram extraídos da implementação já aprovada em `features/ondas-preview`. Os dois arquivos TypeScript da preview agora reexportam essa mesma implementação. O CSS foi movido; não há uma segunda cópia do algoritmo ou do material.

O algoritmo de normais das bordas arredondadas, textura de deslocamento, separação RGB, reflexos e acompanhamento do ponteiro foi preservado. Foi acrescentada somente a proteção para ausência de `ResizeObserver`, que conserva o fallback CSS e evita erro em ambientes sem essa API. Continuam o limite de 320 px para a textura, cache de 32 mapas, reduced-motion e reduced-transparency. Refração SVG permanece disponível em Chromium; outros motores recebem o mesmo fallback de vidro da preview.

## Aplicação

| Antes | Depois | Motivo |
| --- | --- | --- |
| Painéis e controles usavam principalmente azul com alta opacidade e blur genérico. | Tints da preview: painel `#06162438`, campo `#010b1626`, reflexos e borda especular do mesmo material. Componentes com Lens têm fundo próprio transparente. | Permite que o fundo participe da lente, sem uma camada azul bloqueando o efeito. |
| Select, botões, campos, diálogos e navegação tinham materiais separados. | `LiquidLens` compartilhada em Button/ButtonLink, Input/TextArea, Select/Popup, OverlayDialog/header/fechar, DatePicker, ColorPicker, Tabs/indicador, SidebarLink, cabeçalho/rodapé e sidebar carregada ou skeleton. | Usa a mesma óptica em primitivas e estrutura. |
| Popup precisava manter legibilidade. | Popup conserva tint `#0a192fd9` e frost de 8 px, como a preview. | Transparência de superfícies não reduz a legibilidade de listas e diálogos. |
| Redes e nichos apresentavam cores próprias na UI da plataforma. | Redes usam máscara local do SVG original em `currentColor`; nichos usam `Glyph`/`markFor`, como os nichos da preview. | Sem filtros globais, alterações dos assets ou cor embutida que conflite com o tema. |
| Fundo de ferramentas tinha outro radial e somente linhas mais discretas. | Mesmo WaveCanvas, opacidade `.78`, radial em 80%/30%, viewBox 1440×800 e paths/ritmo originais das linhas; glow `::after` e keyframes `light-current` de 24 s copiados literalmente do módulo compartilhado. | Preserva a direção visual aprovada, sem outro shader. |
| Cabeçalho mostrava “Pausar ondas”. | Botão e estado local removidos; preferência de movimento do sistema permanece respeitada. | Atende ao pedido explícito. |

Os campos continuam nativos, com id, label, ref, nome, valor, validação e submissão preservados dentro de uma moldura decorativa. Checkbox/radio/range/color/hidden mantêm sua estrutura; o combobox de busca já utiliza a Lens da própria busca e evita refração dupla. Na preview, as duas Lens externas dos wrappers de Select foram retiradas porque o Trigger agora contém essa mesma camada.

Paletas das páginas pessoais continuam localizadas: tint, fallback, campos, popup e scrollbar seguem `--page-bg`/`--page-ink` e superfícies derivadas da aparência do publicador. Os SVGs de rede/nicho e assinaturas originais não foram alterados.

Scrollbars nativas receberam acabamento especular em WebKit e `scrollbar-color` como fallback Firefox. A scrollbar nativa não suporta o filtro SVG de backdrop usado nos componentes; seu acabamento é CSS. Os diálogos nativos legados `.plan-dialog`/`.link-dialog` receberam o mesmo reflexo e frost via CSS, preservando sua estrutura e legibilidade. Formulários/containers ancestrais deixaram de aplicar um segundo backdrop-filter que limitava a amostragem das Lens internas.

O fallback padronizado da scrollbar é desativado nos elementos que usam a aparência WebKit, pois valores diferentes de `auto` substituem os pseudo-elementos personalizados nos motores que suportam ambos. Referência técnica: [MDN — ::-webkit-scrollbar](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/::-webkit-scrollbar).

## Verificações executadas

- Grafo consultado antes da exploração; callers confirmados no código atual.
- Vitest focal: 12 arquivos, 29 testes aprovados. Inclui algoritmo óptico original, fallback sem ResizeObserver, preservação de label/ref/FormData, controles, cores, abas, diálogo, read-only e shell sem pausa.
- Após o último ajuste do wrapper de busca, `input.test.tsx` foi repetido: 6 testes aprovados.
- 19 arquivos CSS deste lote analisados por PostCSS sem erro.
- `git diff --check` focal nos arquivos alterados: limpo. A verificação global aponta CRCRLF em um arquivo já alterado de criação de link, fora deste lote.
- Busca no código não encontrou seletor global `.link-row` que sobreponha o novo módulo de catálogo.

Lint/typecheck integrados, build e inspeção visual ficam com a raiz após a estabilização dos agentes. Este agente não iniciou E2E, navegador, servidor ou build. Não houve instalação de dependências nem alteração de lockfile, regras comerciais, permissões, tracking ou backend. A igualdade visual final e o custo real de muitas lentes simultâneas dependem da inspeção do build atual; os testes unitários não comprovam esses dois pontos.
