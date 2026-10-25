# Ondas + Liquid Glass — 23/10/2026

Este registro descreve a primeira versão. Após o usuário rejeitar o aspecto de cartão azul, o material evoluiu para lentes SVG e fotografias sob os painéis. A revisão atual, suas fontes e validação ficam em [Liquid Glass com refração](liquid-glass-refraction.md); os resultados abaixo são históricos.

O usuário escolheu Ondas na galeria e pediu uma home mais completa e uma tela de detalhes no mesmo universo, explorando animações e vidro. As rotas são `/dev/homes/ondas` e `/dev/homes/ondas/link/[slug]`. A home pública não foi substituída; as outras 31 direções continuam disponíveis.

## Referências e decisões

Consulta às nove fontes originais, com leitura de páginas primárias e inspeção de navegador. Capturas de pesquisa em `output/ondas-glass-evidence/`. As capturas iniciais de React Bits e Kokonut contêm regiões de demonstração ainda não carregadas: servem como registro da consulta, não como prova de inspeção desses efeitos em execução.

| Fonte consultada | O que fundamentou | Decisão nesta demo |
| --- | --- | --- |
| [React Bits: Waves](https://reactbits.dev/backgrounds/waves) e [Silk](https://reactbits.dev/backgrounds/silk) | Ondulação e luz como material de fundo | Reutilizar o WaveCanvas original do projeto, com uma única camada WebGL; sem instalar componentes |
| [Aceternity: Liquid Glass](https://ui.aceternity.com/components/liquid-glass) | Borda curva, transparência e fallback fosco; refração SVG tem diferenças entre navegadores | Reflexos de borda e vidro via CSS; texto fora de filtros de distorção. Sem anunciar refração física |
| [Magic UI: Shine Border](https://magicui.design/docs/components/shine-border) | Reflexo localizado nas bordas | Luz suave no contorno e resposta de hover; sem brilho contínuo em todos os cards |
| [Motion Primitives: Animated Background](https://motion-primitives.com/docs/animated-background) | Feedback da seleção em navegação e filtros | Nichos e favoritos com estado explícito. Leitor web retornou 403; página e documentação foram acessadas pelo Playwright MCP |
| [Kokonut: Liquid Glass Card](https://kokonutui.com/docs/cards/liquid-glass-card) | Composição de mídia e controles em cartão | O endereço hoje apresenta “Now Playing”; foi tratado como referência de composição, sem afirmar que sua demo atual apresenta refração |
| [21st.dev](https://21st.dev) | Exploração de cards e apresentação de comunidades | Referência de variedade; nenhum componente do marketplace incorporado, nenhuma credencial enviada |
| [Nyx: Water Ripple](https://nyxui.com/components/water-ripple-effect) e [Apple Glass](https://nyxui.com/components/apple-glass-effect) | Continuidade entre material aquático e superfícies de vidro | Atmosfera contínua entre home e detalhe, pausa e versão estática |
| [Fancy: Image Trail](https://www.fancycomponents.dev/docs/components/image/image-trail) | Movimento a serviço da fotografia | Aproximação discreta da imagem no hover; sem trilhas que cubram os links ou sigam o toque |
| [Codrops: Real-time Multiside Refraction](https://tympanus.net/codrops/2019/10/29/real-time-multiside-refraction-in-three-steps/) | Diferença entre transparência, reflexão e refração real | Evitar uma segunda cena 3D e passes de renderização; o vidro é uma interpretação CSS, não simulação física |

Nenhum código dessas bibliotecas foi copiado, nem suas licenças foram presumidas para incorporar componentes. Não houve instalação ou alteração de dependências. As fotografias usam o proxy existente com ids fixos do Unsplash, tratamento de erro e indicação de origem. Refero não estava disponível entre as ferramentas habilitadas.

## Composição e arquitetura

- Rotas do App Router validam ambiente de desenvolvimento e slug, com noindex.
- `features/ondas-preview/wave-home.tsx`: hero com busca, nichos, destacados, catálogo, ordenação, coleções acionáveis e caminho para divulgação.
- `wave-link-detail.tsx`: capa, identificação da rede, favorito, CTA simulado, descrição completa, informações, copiar link, explicação de denúncia e relacionados.
- `wave-link-card.tsx`: card tipado reutilizado nas duas telas, título e descrição truncados, patrocinado separado de favorito, rede e views ilustrativas.
- `wave-frame.tsx`: atmosfera compartilhada, pausa e retorno à galeria. Reutiliza o WaveCanvas já existente, sem duplicar renderer.
- `ondas-preview.module.css`: material e composição locais. Navy/turquesa, Outfit/Source Sans 3 e cabeçalho compartilhado preservados. Nenhum token experimental promovido a contrato global.

Reutilizados: dados, filtros com normalização, favoritos locais, fotos e fallback, logos de redes, ícones, Select e contador de views. A lógica comercial, saída real, analytics e permissões não foram reimplementadas.

## Regras observadas nesta superfície

Estas decisões descrevem somente a extensão experimental de Ondas e Liquid Glass. `DESIGN.md` e `.impeccable/design.json` continuam registrando o sistema compartilhado; não precisam ser regenerados por esta extensão.

- **Paleta:** fundo navy local (`#081c2e`), texto claro (`#f0fafb`), texto secundário (`#b7d3dc`) e turquesa da marca (`#4af9eb`) em ação, seleção e foco. Vidro e sombras são valores locais, não novos tokens públicos.
- **Tipografia:** Outfit com peso 500 nos títulos; Source Sans 3 em leitura e controles. O título da home usa `clamp(44px, 5.3vw, 76px)`; títulos de seção, `clamp(26px, 3vw, 36px)`; cards, 23px; leitura de descrição, 14–19px conforme contexto. Breakpoints locais ajustam esses papéis, sem alterar a escala global.
- **Composição:** conteúdo limitado a 1280px; hero em duas colunas com busca junto da promessa e fotografia curva à direita. Cards em três colunas, duas abaixo de 850px e uma abaixo de 600px; no mobile a busca precede a fotografia. O detalhe sobrepõe o resumo à imagem e empilha conteúdo/informações abaixo de 600px.
- **Material:** reflexos internos, transparência e blur criam o vidro; a fotografia recebe curvas assimétricas no hero e na capa. Cards mantêm cantos de 18px; controles principais, 12px. A tipografia não recebe distorção óptica.
- **Hierarquia:** busca → patrocinados → catálogo → coleções → divulgar; no detalhe, imagem/resumo → descrição completa/informações → relacionados. A categoria não é repetida como linha acima do h1; permanece nos metadados e nas informações. Estado de favorito e identificação de patrocinado têm funções distintas.

## Movimento e limites

O fundo solicita WebGL com `powerPreference: 'low-power'`, DPR limitado a 1,25, visibilidade/interseção e pausa já implementadas. Essa configuração não comprova baixo consumo medido. A renderização estática em reduced-motion usa o fundo CSS e linhas SVG. Sem GPU, o CSS mantém atmosfera e contraste. Vidro sem backdrop-filter ou com transparência reduzida recebe superfície opaca. Elevação e aproximação de imagem no hover são restritas a dispositivos com hover e sem movimento reduzido; não há animação de entrada escondendo conteúdo.

O custo depende de GPU, área e viewport; não foi medido em aparelho físico. Não há nova biblioteca de animação, WebGL ou UI. Ações de acesso e denúncia são simulações explícitas; favoritos funcionam somente neste navegador. Imagens de publicadores são hipótese de apresentação, sem fluxo de upload implementado.

## Validação

O executor principal registrou lint, typecheck, build e 563 testes unitários aprovados. Depois da correção de acabamento, a rodada formal passou sem atualização de baselines: oito E2E específicos de Ondas e quatro da suíte de direções (12 casos), com seis comparações visuais novas e duas da home Ondas (oito comparações). O documentador conferiu os registros e o código, sem reexecutar testes.

| Verificação executada | Resultado / limite |
| --- | --- |
| Busca normalizada, combinação de nicho/rede, ordenação, favoritos persistentes, coleções e estado vazio | Aprovados em Chromium desktop 1440×1080 e mobile emulado 390×844 |
| Navegação home → detalhe → home, favorito no detalhe, relacionados | Aprovados; nove slugs existentes, slug desconhecido retorna 404 no desenvolvimento |
| Acesso simulado, clipboard com sucesso/erro, explicação da denúncia | Feedback verificado, nenhuma escrita no backend nas jornadas |
| Axe WCAG A/AA em main, foco de teclado e reflow | Sem violações detectadas nos estados testados; larguras 320/768/1280 e zoom CSS de 200% sem overflow horizontal |
| Pausa, renderer WebGL disponível, contexto indisponível e imagem 503 | Testados; busca permanece funcional nos fallbacks |
| Reduced-motion | Capturas determinísticas com fundo CSS estático e sem animações em execução |
| Sem backdrop-filter / transparência reduzida | Regras CSS implementadas e revisadas; sem prova de execução em Safari/Firefox ou aparelho físico |
| Navegador com imagens reais | 13 elementos de foto na home e quatro no detalhe, todos carregados; nove imagens únicas reutilizadas; noindex/nofollow confirmado |
| Detector Impeccable e proveniência | Detector executado uma vez: `[]`; scan de 33 rasters da galeria: zero sem origem |
| Build final isolado | Aprovado; avisos existentes em workspace-dashboard, workspace-section, profile-content-editor e raiz inferida por lockfiles; sem aviso no CSS de Ondas |

Revisão independente: primeiro retorno `fix` para a categoria repetida acima do h1. A linha foi removida, mantendo o assunto/tipo nas informações. Novas capturas foram conferidas pelo mesmo revisor: **`ship` para a correção avaliada**, sem regressão visual identificada nessa correção. Esse veredito estático não comprova movimento ou desempenho físico. O documentador preservou DESIGN.md e o sidecar globais, registrando apenas a extensão experimental.

O teste opcional que iniciaria outro servidor local com o build de produção foi bloqueado pela revisão automática; o retorno informou apenas bloqueio por política. Esse servidor não foi iniciado nem o teste HTTP de produção executado. O bloqueio não afetou o build ou a prévia ativa em 3013. A restrição de ambiente permanece no código das rotas, sem alegar validação HTTP em produção.

Capturas em `.impeccable/review/ondas/` registram abertura e página completa de home, detalhe e título longo em desktop/mobile. A conferência documental inspecionou `desktop-opening.png` e `detail-mobile-opening.png` junto dos cinco arquivos de implementação e das duas rotas. As capturas usam as nove fotos locais da suíte para estabilidade; o executor principal também inspecionou o navegador com o proxy real. São evidências estáticas, sem prova de desempenho ou uso em aparelho físico, nem aprovação de produção.

Execução isolada em `output/home-gallery-runtime-3013-copy-20261023`, porta 3013, preserva o cache da galeria durante builds e testes. Fonte de implementação permanece em `frontend/src`; a cópia operacional deve ser sincronizada após mudanças. A porta 3012 pertence a outro projeto e não foi encerrada.

Para repetir a suíte da fatia com a prévia ativa: `npm exec playwright test -- --config playwright.ondas.config.ts`. A variável `TEMLINK_PREVIEW_URL` permite outra origem local. A suíte de direções aceita `TEMLINK_DIRECTIONS_URL` para usar um servidor existente sem iniciar/parar outro aplicativo. O E2E principal com containers não é necessário para mocks sem backend.

Reversão: retirar as duas rotas estáticas Ondas e o diretório `features/ondas-preview` devolve `/dev/homes/ondas` à direção dinâmica anterior; restaurar metadata/thumbnail e snapshots correspondentes. Não fazer reset da árvore compartilhada, que contém mudanças de outras tarefas.

Grafo atualizado localmente após as alterações: 7354 nós e 25698 relações, sem LLM/API ou envio de código externo; CSS, capturas e estas decisões documentais não são cobertos pela extração estrutural.
