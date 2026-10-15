# Ícones e navegação

Atualização de 15/10/2026. Escopo: substituir desenhos aproximados de redes por símbolos de marca, uniformizar o peso visual dos nichos e tornar a navegação do cabeçalho perceptível.

## Assets locais

- 19 redes recebem logos de origem registrada em `frontend/public/networks/sources.json`. As marcas disponíveis no Simple Icons usam revisão fixada `4d29a35c954699b389a834aacc97dd6e7e74143c`, com referência ao kit de marca de origem. Kwai, LinkedIn, Privacy, Fansly e Fatal Model usam assets publicados pelas próprias plataformas; alguns são bitmaps originais encapsulados em SVG, sem redesenho.
- Logos são decorativos junto do nome, com proporções preservadas e sem requisições a terceiros durante o uso. Site/Outro continuam com símbolos genéricos; um slug desconhecido não recebe um logo inventado.
- Os 26 nichos usam pictogramas preenchidos e coloridos no mesmo tamanho-base de 18 px dos logos de redes. São conceitos do produto, não marcas. Fontes e licenças estão em `frontend/public/niches/sources.json`; Heroicons solid (MIT), exceto futebol, que usa Material Icons (Apache-2.0). Cópias das licenças estão em `frontend/public/icon-licenses/`.
- Ícones de marca não significam parceria, aprovação ou patrocínio das plataformas. Respeitar diretrizes de marca ao usar esses assets em outros contextos.

## Cabeçalho

Referência de navegação: [Atlassian Navigation System](https://atlassian.design/components/navigation-system/layout), adaptada à identidade existente, sem copiar marca nem instalar UI externa. Links têm rótulo e ícone decorativo de 20 px, texto de 16 px e área mínima de 48 px. Busca e destinos de conta são preservados; a rota atual é indicada por aria-current.

No celular, o botão Menu abre links em uma lista vertical. Escape recolhe e devolve foco ao botão; os itens ocultos não entram na navegação por teclado. Os papéis USER/ADMIN apenas definem apresentação conforme contrato anterior; autorização permanece no backend.

## Ajustes da home

O título fica em uma linha no celular com escala tipográfica responsiva. O botão Mostrar mais fica a 16 px do grid, em vez de 32 px. Explorar continua centralizado, com nomes sem quebra de linha, duas linhas por grupo e expansão dos demais itens.

Fontes adicionais: [Simple Icons](https://github.com/simple-icons/simple-icons), [Kwai Brand Resource](https://www.kwai.com/id/brand-resource), [LinkedIn Downloads](https://brand.linkedin.com/downloads), [Privacy Brand](https://privacy.com.br/brand), [Fansly](https://fansly.com/), [Fatal Model](https://fatalmodel.com/), [Heroicons](https://github.com/tailwindlabs/heroicons) e [Material Design Icons](https://github.com/google/material-design-icons).

## Verificação desta etapa

- 18 testes afetados aprovados; typecheck e lint dos arquivos desta alteração aprovados.
- Chromium em 320, 390, 768 e 1440 px, com variantes visuais público/USER/ADMIN: navegação, alvos de clique, ícones, menu mobile, Escape/foco e axe A/AA aprovados. Cookies de papel foram usados apenas para verificar apresentação, não para conceder acesso a rotas protegidas.
- Título em uma linha nos tamanhos mobile e distância de 16 px entre grid e Mostrar mais verificadas no navegador. Os 45 arquivos de ícones carregaram localmente; a galeria foi inspecionada visualmente.
- Regressão de Mostrar mais em desktop e mobile: 15 → 39 → 63 orgânicos, 9 patrocinados preservados, sem recarga e sem alteração da rolagem; inclui erro HTTP e nova tentativa.
- Compilação de produção e verificação de tipos passaram em cópia isolada, com `--no-lint`, sem interromper o servidor aberto pelo usuário. O lint global continua bloqueado por `notice` não utilizado no catálogo, após o aviso correspondente ter sido comentado em alteração local preservada.
- Suíte completa: 130 aprovados e 4 falhas fora desta fatia — 1 teste espera o aviso de status comentado no catálogo; 3 testes do formulário de envio procuram Nome, mas o rótulo local foi alterado para Titulo. Essas alterações locais não foram revertidas nem seus testes mascarados.
