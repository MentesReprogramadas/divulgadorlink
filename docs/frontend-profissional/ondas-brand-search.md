# Ondas: marca, busca e catálogo — 23/10/2026

Registro da revisão atual de `/dev/homes/ondas` e `/dev/homes/ondas/link/[slug]`. O usuário manteve as ondas e pediu alinhamento à marca, ícones de nichos/tipos, card inteiro clicável, foto unida ao corpo sem margem ou texto sobreposto, patrocinados distintos, detalhe com foto maior sem a legenda rejeitada, Select inteiro em vidro e busca objetiva com sugestões locais.

## Escopo e identidade

A branch existente `codex/roadmap-f37-testes` foi preservada. A identidade vem de `frontend/src/styles/primitives.css`, `tokens.css`, `DESIGN.md` e do cabeçalho compartilhado: navy (`#0a192f`), turquesa (`#4af9eb`), Outfit nos títulos e Source Sans 3 na leitura e nos controles. O navy escurece a composição experimental; o turquesa identifica ação, foco e destaque. Materiais, medidas e composição desta prévia permanecem locais. `DESIGN.md`, `.impeccable/design.json` e `PRODUCT.md` não foram reescritos nesta revisão.

O toro 3D foi retirado por orientação do usuário. `WaveCanvas` voltou ao shader e ciclo de vida anteriores; ondas WebGL, linhas e correntes CSS compõem o fundo, com pausa e movimento reduzido. As outras 31 direções continuam disponíveis. A escolha Ondas aprofunda uma hipótese da galeria; não substitui `/` nem altera `/divulgar`.

## Composição observada

- Hero: “Encontre seu próximo link.” em uma linha, centralizado e sem painel de fundo. Título ajusta tamanho no celular; apoio, busca e redes ficam centralizados. Campo sem título visível nem botão de envio, com label acessível, foco visível e envio por Enter.
- Cards: fotografia sem padding, borda ou texto sobreposto, seguida do painel de conteúdo. Uma âncora com nome acessível cobre o card; favorito é um botão irmão, acima da área clicável. Título e descrição são truncados no card; o detalhe mantém o conteúdo completo.
- Patrocinados: rótulo explícito, badge turquesa, faixa superior e corpo distinto. Entre 851 e 1100 px, rótulos de patrocinado/assunto empilham em área de altura consistente. Esse tratamento não confirma elegibilidade nem promete audiência.
- Ícones: `Glyph` existente; Tecnologia, Música, Jogos e Educação reutilizam marcas canônicas. Viagens, Gastronomia, Fotografia e os três tipos usam desenhos locais distintos. O cadastro de nichos não mudou.
- Detalhe: fotografia ampliada com `object-fit: cover`, sem letterbox, padding ou legenda. O corte preenche a moldura e pode omitir bordas da foto. Foto e resumo ficam lado a lado acima de 850 px; abaixo disso, empilham. Informações, texto integral e relacionados ficam depois. O footer mantém “dados fictícios” e atribuição das fotografias ilustrativas.
- Select: `popupClassName` e `popupBackdrop` são pontos opcionais de composição no componente compartilhado. A prévia fornece vidro no acionador e no popup, inclusive opções, hover e seleção. Defaults globais e contrato de mudança permanecem preservados.

## Material e resposta

`LiquidLens` aplica a refração ao fundo, não às letras. A lente combina mapa de deslocamento arredondado, separação RGB discreta, aro luminoso e baixo fosco; as superfícies de sugestões e Select usam fosco de 8 px e tinta navy mais densa para separar o texto do fundo. A luz acompanha ponteiro apenas quando movimento e dispositivo permitem. Ondas e correntes respeitam pausa e movimento reduzido.

A refração SVG é habilitada conservadoramente em Chromium. Outros engines mantêm vidro CSS fosco; sem suporte a backdrop-filter ou com transparência reduzida, entra superfície opaca. Esse fallback está implementado; sua existência não equivale a teste real em Safari ou Firefox.

## Sugestões da demonstração

O campo vazio mostra até três links orgânicos, ordenados pelas visualizações fictícias. Durante a digitação, reutiliza `filterPreviewLinks`: título, descrição, assunto, tipo e rede, com normalização de acentos e ordenação por visualizações. Patrocinados que correspondem à consulta conservam o rótulo. As sugestões não incorporam os demais filtros ativos; consultam os nove mocks da prévia.

Enter aplica a busca ao catálogo. Tab/Enter percorrem e abrem links de sugestão. Escape fecha o painel e devolve foco ao campo. Sem correspondência, o painel informa que Enter abre os resultados da busca. Favoritos mantêm storage local próprio e aviso em caso de bloqueio; acesso externo é simulado, copiar link possui tratamento de erro e a demonstração não envia denúncias.

Não há personalização, histórico, cookies novos, embeddings, BFF novo ou treinamento. Não foi alterado o recomendador público, backend, consentimento, analytics ou regra comercial. Não foram adicionadas dependências ou alterados lockfiles por esta revisão.

## Implementação e reversão

Os pontos principais estão em `frontend/src/features/ondas-preview/`: `wave-home.tsx` compõe busca e filtros; `wave-link-card.tsx` separa âncora e favorito; `wave-link-detail.tsx` compõe o detalhe; `wave-facet-icon.tsx` mantém os desenhos semânticos; `wave-frame.tsx` compõe ondas/pausa; `ondas-preview.module.css` e `liquid-lens*` mantêm o material local. `frontend/src/components/ui/select.tsx` e `select.module.css` contêm os pontos opcionais necessários ao popup composto. Dados, filtro, fotos e favoritos reutilizam `frontend/src/features/home-preview/`.

Regressão: `frontend/e2e/ondas-preview.spec.ts`, seus goldens em `frontend/e2e/ondas-snapshots/`, testes locais de óptica/ícones e testes dos helpers reutilizados. Reversão deve retirar os trechos desta revisão na feature, composição opcional do Select e goldens correspondentes. A árvore compartilhada contém alterações de outras tarefas; não restaurar arquivos inteiros ou usar os relatórios históricos como estado atual.

## Evidências e limites

Lint, typecheck e 17 testes unitários em cinco arquivos passaram com a fonte TypeScript atual, antes dos dois ajustes finais, restritos a CSS. O build de produção após esses ajustes passou, incluindo seus checks; log: `output/ondas-glass-evidence/build-brand-final.log`.

No estado final, a repetição sem atualizar goldens passou: 20 E2E de Ondas (1,3 min) e quatro da galeria (27,2 s). A jornada verifica busca/filtros/favoritos, navegação, teclado, reflow/zoom, contraste automatizado, fotos separadas do texto, material dos Selects, refração e fallbacks. Os goldens haviam sido atualizados após os dois ajustes de CSS; a repetição final confirmou a comparação. A revisão independente inicial solicitou dois reparos: foto do detalhe sem letterbox e alinhamento dos rótulos de destaque entre 851 e 1100 px. O mesmo revisor reabriu as 30 capturas finais, confirmou ambos resolvidos e emitiu `ship`, sem pendências nesse escopo. O retorno final complementa a revisão inicial; não representa nova auditoria integral de toda a aplicação.

Capturas em `.impeccable/review/ondas-brand/`: 30 arquivos válidos, sendo nove completos, nove aberturas e 12 estados rolados de cards, informações, busca e Select. Cobrem home, detalhe e título longo em desktop (1440 × 1080), mobile (390 × 844) e viewport do usuário (928 × 884). O agente principal inspecionou as capturas; a documentação foi conferida contra a fonte. O fundo fixo exige estados rolados além da captura completa.

Na inspeção real via Playwright MCP, buscar “musica” exibiu Frequência indie e a sugestão abriu o detalhe na URL correta. Evidências: `output/ondas-glass-evidence/home-mcp-final.png` e `detail-mcp-final.png`. A home também foi inspecionada no navegador da aplicação em 928 × 884.

A detecção Impeccable da feature e composição Select retornou `[]` antes dos dois ajustes de CSS, sem nova execução. Proveniência raster: 33 arquivos, nenhum sem origem. O índice Graphify foi atualizado incrementalmente, com 7371 nós e 25756 relações, sem envio externo; CSS, fotografias e capturas dependem das verificações próprias.

Não foram testados Safari, Firefox, aparelhos físicos ou FPS. A demo na porta 3013 usa runtime copiado; a API de consentimento na porta 4098 já estava inativa. Não há evidência de produção, ganho de conversão, personalização real ou acessibilidade total.

## Ajuste do hero — 23/10/2026
Pedido posterior: centralizar e retirar o painel; título em uma linha. Aplicado em wave-home.tsx e no CSS local, com fonte fluida e tamanho menor até 600 px. Busca e redes centralizadas, mantendo vidro. Inspeção Chromium em 320, 390, 768, 928 e 1440 px confirmou encaixe; medidas em 320/768/928 indicaram uma linha, sem overflow. Provas em output/ondas-glass-evidence/hero-centered-{desktop,mobile,928}.png. Lint, tipos e build atual passaram (build-centered-hero.log). Execução estável: 20 casos Ondas e dois da galeria passaram com atualização de goldens; quatro casos de comparação/fluxo repetidos sem atualização passaram. Uma execução anterior durante HMR falhou ao navegar; a repetição estável passou sem mudança no fluxo. Sem novos unitários para esta alteração de apresentação. A revisão independente descrita acima pertence à etapa anterior; não foi repetida para este ajuste pontual. Limites de engines e hardware permanecem.
