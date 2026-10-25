# Contornos dos cards e fundo no celular — 25/10/2026

Correção solicitada a partir da captura do Safari no iPhone. Mantém a identidade Ondas, o catálogo masonry e as regras de publicação, destaque, mensuração e assinatura.

| Antes | Depois | Motivo |
| --- | --- | --- |
| O conteúdo dos cards sem imagem recebia cantos superiores retos, inclusive no patrocinado. | O conteúdo herda a curva externa quando é o primeiro filho; com foto, mantém a junção reta abaixo dela. | A borda interna do vidro deixava de acompanhar os cantos do card. |
| O canvas opaco era limpo a cada notificação de tamanho e aguardava outro frame para pintar. | Só altera dimensões diferentes, repinta imediatamente e permite transparência até o fundo CSS. | Evita expor o buffer limpo durante redimensionamentos ou frames atrasados. |
| A perda do contexto gráfico não tinha recuperação explícita. | Exibe o gradiente CSS durante a perda e recria os recursos quando o contexto retorna. | Mantém um fundo utilizável mesmo sem WebGL. |
| A altura do fundo fixo acompanhava mudanças da área disponível. | Usa altura mínima do maior viewport, com fallback `100vh`. | Reduz mudanças durante a expansão/retração da barra do navegador. |

A especificação de [unidades de viewport](https://www.w3.org/TR/css-values-4/#viewport-relative-lengths) e a apresentação do [Interop 2022 pelo WebKit](https://webkit.org/blog/12288/working-together-on-interop-2022/) fundamentam a escolha de `lvh`. Isso não comprova, sozinho, o comportamento em um aparelho físico.

## Escopo e evidência

Alterações de produção em `link-row.module.css`, `ondas-atmosphere.module.css` e `wave-canvas.tsx`. Callers confirmados no código após consulta ao Graphify: `LinkRow`, `OndasAtmosphere` e `SiteShell`. O renderer experimental da galeria permanece separado. Preservados limite de 30 fps, DPR máximo 1,25, pausa, reduced-motion e interrupção quando oculto.

- Teste unitário reproduziu a ausência de pintura imediata e de tratamento de perda do contexto antes da correção: dois casos falhavam. Os três casos do renderer passam após o ajuste.
- Frontend: lint, tipos e 767 testes em 208 arquivos aprovados na árvore local compartilhada.
- E2E Chromium/WebKit Linux: cinco casos aprovados na execução final (setup e duas regressões por engine), incluindo perda/restauração real do contexto nos dois navegadores. Capturas de fallback e recuperação conferidas.
- `npm run build`: aprovado, incluindo geração das 75 páginas. Avisos existentes de workspace, integração ESLint e CSS fora deste escopo permanecem.
- Inspeção das capturas: contorno orgânico e variante visual patrocinada; capas, ausência/falha de imagem, larguras de 320 a 1440 px, teclado, zoom e redução de movimento nos testes afetados. A variante visual não cria uma promoção nem altera elegibilidade.
- Detector Impeccable nos três arquivos visuais: nenhum achado. Sidecar de contexto já estava desatualizado; não foi reparado neste escopo.

As medidas do fundo descontam a área reservada às barras de rolagem, exposta de maneira diferente por Chromium e WebKit. O teste de encaixe aguarda o ResizeObserver após mudança de largura, mantendo os mesmos limites de espaçamento. Nenhuma tolerância visual foi ampliada.

Extração incremental local do Graphify: 41 arquivos reavaliados, 1.512 reutilizados, 7.797 nós e 27.948 relações; sem LLM, API ou clustering. Inclui trabalho paralelo na árvore compartilhada, portanto o índice global não integra este commit. CSS e capturas dependem da inspeção própria.

## Limites e reversão

Não houve teste em iPhone físico nem medição de consumo da GPU. WebKit Linux com toque e viewport móvel aproxima o Safari, mas não reproduz todo o hardware/compositor do iOS. Os testes provocam perda/restauração do contexto e mudanças de tamanho; não demonstram que a intermitência exata do aparelho foi reproduzida.

Sem mudanças de banco, preços ou permissões. Reversão: reimplantar somente o web no commit anterior `648afe8e274ea8ece20a86debf09c59146363e62`. Evidências locais em `output/home-scroll-border-20261025/`; publicação e checks do commit exato devem ser registrados no resultado da entrega.
