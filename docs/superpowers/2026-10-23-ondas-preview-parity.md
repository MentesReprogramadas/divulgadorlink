# Ondas — autoridade da preview e auditoria de paridade

## Atualização de runtime — rodada atual

O bloqueio histórico descrito adiante foi resolvido após novo pedido do usuário. A demo em http://ondas.localhost:3013/ já usa o código atual, em `.next-ondas-demo`, separado do diretório removido pelo E2E. Home e detalhe foram comparados com a referência em1440/390px e usam a mesma lente/CSS; capturas abertas em `output/ondas-demo/parity-current/`. A auditoria consolidada cobre535 arquivos de apresentação. Estado, medições, regressões e limites atuais: [relatório final](2026-10-23-ondas-final-audit.md). As contagens e os bloqueios das seções antigas abaixo são históricos e não descrevem o servidor atual.

## Decisão vigente

A referência aprovada é a **preview `/dev/homes/ondas` e seu detalhe**, e não uma interpretação genérica de vidro azul. Na correção mais recente, o usuário rejeitou a adaptação aplicada à produção e exigiu reaproveitar a composição e o material da preview, retirar ícones coloridos e o botão visível “Pausar ondas”, incluir o acabamento das barras de rolagem e propagar o mesmo material às demais telas. A autorização para implementar permanece; não foi criado outro fluxo de aprovação.

A rota estática usa `WaveHome`, `WaveFrame`, `WaveLinkCard` e `WaveLinkDetail` em `frontend/src/features/ondas-preview`. Ela prevalece sobre a rota dinâmica `home-directions/DirectionHome`. O antigo `home-preview/GlassLinkCard` também não é a referência de composição escolhida. O grafo foi consultado primeiro e as relações foram confirmadas nos arquivos atuais; a extração do grafo pode anteceder as últimas edições.

## Evidência e alcance

Foram abertas as capturas existentes `output/ondas-resources-visual/ondas-preview-1440-viewport.png`, `ondas-preview-390-viewport.png`, `ondas-preview-detail-1440.png`, `demo-home-loaded-1440.png`, `demo-home-loaded-390.png` e `demo-detail-1440.png`. Elas demonstram a divergência **anterior à correção atual**. Não foram geradas novas capturas nesta auditoria.

Os valores abaixo foram conferidos em CSS e JSX. A coluna de intenção define a referência de implementação; **não afirma paridade pixel a pixel em navegador**.

| Área | Produção anterior observada | Preview / intenção vigente | Fonte da correção |
| --- | --- | --- | --- |
| Material | Superfície `#102c40b8` (~72%), blur 14px, sem refração | `LiquidLens` compartilhada: displacement SVG com canais RGB, frost padrão .65px quando refrativa, rim especular e luz por ponteiro; `cardCopy` tint `#06162438` (~22%) | `components/ui/liquid-lens.tsx` e `.module.css`; preview reexporta a mesma lente |
| Hero | Texto com peso 600, subtítulo diferente | “Encontre seu próximo link.”, subtítulo da preview; Outfit 500, `clamp(20px,5.8vw,64px)`, entrelinha 1.04 | `catalog/server/home-page.tsx`, `catalog/components/ondas-catalog.module.css` |
| Busca | Máximo 760px, fundo elevado | Máximo 650px, lente, sem título visível nem botão de envio | `components/domain/home-search.tsx`, `search-box.tsx` e seus estilos |
| Grade | Auto-fit mínimo 300px; captura mostrava 2 destaques e 4 orgânicos | 3 colunas / gap23px; 2 até850px; 1 até600px | `components/domain/catalog-grid.module.css` |
| Card | Raio16px, capa16:9, favorito sobre a fotografia | Raio24px, capa1.6 sem espaço; favorito no bloco textual; sem slot de imagem quando ausente | `components/domain/link-row.tsx` e `.module.css`, `CatalogImage` |
| Tipografia do card | Título20px em1linha; descrição16px com expansão | Título23px/2linhas (25px em destaque), descrição14px/2linhas; texto completo no detalhe | `ondas-catalog.module.css`, composição `cardCopy` |
| Destaque | Borda/gradiente discretos, marcador pequeno | Mesmo card com `data-featured`, separador turquesa e rótulo Patrocinado preenchido | `home-catalog.tsx`, `link-row.tsx` |
| Detalhe | Colunas1.1:1 esticadas, imagem4:3, Sobre central720px | Colunas1.2:1 alinhadas ao topo; imagem550px em desktop; Sobre + informações ao lado; mobile empilhado | `catalog/components/link-detail.tsx`, `ondas-catalog.module.css` |
| Fundo | Canvas.65, outras curvas, sem brilho adicional | Mesmo `WaveCanvas` já compartilhado; canvas.78, curvas1440×800, drift18s e brilho24s | `layout/ondas-atmosphere.tsx` e `.module.css` |
| Ícones | SVGs coloridos de nichos/redes | Traço/máscara em `currentColor`, desenhos identificáveis e rótulos preservados | `components/ui/facet-badge.tsx` |
| Navegação | Lista de facetas em dois grupos | Nichos em pills, sete iniciais + Para descobrir, expansão para os demais; atalhos reais WhatsApp/Telegram/Discord e select para todas as redes | `catalog/components/home-navigation.tsx` |
| Coleções e publicação | Ausentes | Mesma composição da preview; até3 assuntos reais distintos com capa aprovada, título do link e CTA de publicação gratuita | `catalog/components/home-collections.tsx` |
| Rolagem e pausa | Barra nativa sem acabamento; botão no shell | Material da rolagem nos fundamentos; botão retirado por pedido explícito; reduced-motion e fallbacks preservados | `styles/foundations.css`, `styles/tokens.css`, `layout/site-shell.tsx` |

Os dados reais não são substituídos por números, destaques, fotografias ou promessas da mock. Tipo, highlights e outras informações ausentes no DTO não são inventados. As páginas personalizadas continuam preservando a escolha do proprietário.

## Auditoria de contratos — leitura de fonte

| Contrato | Conferência realizada | Limite |
| --- | --- | --- |
| Tenant, SSR e SEO | `loadHome` continua usando host/tenant e transporte server; JSON-LD, canonical e robots permanecem no servidor | Sem requisições novas nesta auditoria |
| Filtros | `discoveryQueryRecord` preserva cidade/idioma/participação nas rotas, busca e novas facetas; cursor segue no carregamento da home; filtros reais ficam em disclosure e abrem quando ativos | Comportamento de navegação dos componentes novos tem teste unitário; composição completa aguarda navegador |
| Idade | `HomeTopics` usa `exploreNiches` lead+mild e mantém indicação18+; atalhos do hero não destacam redes restritas; select conserva todas as redes e deixa o gate na rota real; detalhe conserva `AgeWall` | Não há nova política comercial ou confirmação etária no componente visual |
| Destaques pagos | Placement e marcador continuam derivados dos arrays patrocinado/orgânico do backend; nenhuma elegibilidade/preço é calculada pelos novos componentes | Pagamento/elegibilidade não foram exercitados |
| Analytics e saída | Cards conservam `surfaceToken` no href; detalhe conserva `trackedGoPath`, `queryId` válido e `Impression` dentro do fluxo com AgeWall; não há novo evento disparado pela lente | Não foi executado rastreamento real |
| Paginação | `HomeCatalog` mantém pending ref, cursor, filtros, deduplicação, append, retry e `showImpressions` por resposta; `HomeMore` continua disponível | Continua paginação incremental por botão; não foi inventado infinite scroll automático |
| Busca | SearchBox mantém sequência de requisições, descarte de resposta antiga, combobox/setas/Enter/Escape, age prompt, surfaceToken e query de descoberta | A implementação real abre sugestões após digitar; a preview também sugere ao focar vazio. Esta diferença não foi ocultada nem preenchida com dados fictícios |
| Favorito | `FavoriteButton` mantém sessão, API GET/PUT/DELETE, 401, pending e política readOnly; só material/classe foram alterados | Foco por Tab e alvo geométrico exigem navegador |
| Ordem do catálogo | A ordem continua vindo do backend | O select “Mais visualizados” da mock não foi apresentado como feature funcional sem contrato real |

## Achados concretos comunicados à raiz

1. **Área clicável da foto:** ao compor `cardCopy`, `body` ganhou `position:relative`; o antigo `a::before` passou a cobrir somente texto. A raiz corrigiu em fonte com hit area irmã do body, z4, e favorito/ações irmãos z5. Há somente um link de card por Tab e favorito separado no JSX. A evidência é de estrutura/CSS; o clique na foto e a ordem real do teclado ainda precisam ser conferidos no navegador.
2. **Seletores não transportados por `composes`:** hover e reduced-motion estavam restritos a `.page`, enquanto a produção usa `.publicPage`; a imagem real também é `img` direta. A raiz adicionou os seletores de `.publicPage`, hover da imagem direta e o escopo de reduced-motion. CSS Modules compartilha classes, mas não reescreve automaticamente esses ancestrais.
3. **Brilho do fundo em outro módulo:** o `::after` da atmosfera copiada tinha outro hash e não incidia no componente real. A raiz incluiu o brilho e seus fallbacks no módulo de `OndasAtmosphere`.
4. **Teste legado de ícone:** `home-catalog.test.tsx` procurava o ícone dentro do link. O hit area acessível agora tem somente o nome oculto; o ícone continua na apresentação do article. Foi solicitado preservar a asserção de mídia, adaptando seu alvo ao card. Não se deve descartar esse teste para acomodar o redesenho.

As referências `composes` lidas (`card`, `cardCopy`, `photoLabels`, `cardMeta`, `cardFoot`) existem no módulo compartilhado e os caminhos relativos apontam para ele. Esta conferência não substitui a compilação Next/CSS Modules. A raiz ficou responsável por alinhar skeletons à nova estrutura; não foram alterados por este revisor.

## Verificações realmente executadas por este agente

- `home-navigation.test.tsx`: **5/5 passaram**, incluindo expansão/recolhimento, manutenção de nicho restrito, query e slug codificado; o novo select real Base UI oferece redes adicionais/18+ e navega para a rede ou Todas as redes preservando filtros.
- `home-collections.test.tsx`: **2/2 passaram**, verificando três assuntos distintos com capa real, URL pública de mídia, query, ausência de coleção sem foto e CTA gratuito.
- TDD observado: primeira rodada teve5 falhas esperadas e1 teste já verde; implementação passou6/6. Adição do select teve1 falha esperada por combobox ausente e depois5/5 na navegação.
- ESLint dos quatro arquivos novos passou; após adicionar select, ESLint dos dois arquivos de navegação passou novamente.
- A auditoria posterior dos arquivos da raiz é **somente fonte**. Nenhuma suíte de homepage, LinkRow, busca, favorito ou detalhe da raiz foi executada por este agente nesta rodada.

## Validação pendente

### Integração pela raiz

Build final confirmado com exit0: `6-8_H1hclehYthZ2V6mJE`, em `frontend/.next/BUILD_ID`, log `output/ondas-parity-build-final.log`. Ele ainda não está sendo servido. A conferência final da porta3013 mantém o próprio processo70140; banco/API não foram interrompidos.

Após congelar a implementação, lint e TypeScript do frontend/E2E passaram. A suíte completa inicial encontrou três falhas em 600 testes: o contador novo duplicava uma região status; o teste de navegação encontrava o SVG interno da lente; e a leitura inicial do teste de fallback ocorreu antes de finalizar a derivação de iniciais. O contador deixou de anunciar redundantemente, o teste passou a inspecionar o ícone direto sem retirar a prova de unicidade e o fallback final foi reconferido. Seis arquivos/36 testes afetados passaram. A reexecução completa final passou **175 arquivos/600 testes, sem falhas**, em96,03s (`output/ondas-parity-vitest-final.log`). As tentativas anteriores e seus logs foram preservados.

O primeiro build Next de produção passou, compilando os CSS Modules compartilhados e seus `composes`. Um aviso novo de compatibilidade de `align-items:start` foi corrigido para `flex-start` e o build final é registrado em `output/ondas-parity-build-final.log`. Avisos anteriores de alinhamento em outros módulos e inferência de workspace com dois lockfiles não foram tratados como falha nem motivaram alterar dependências/lockfiles.

O índice incremental local foi atualizado:61 arquivos de código reprocessados,1422 reutilizados;7508 nós/26315 relações. Sem LLM, API, clustering ou envio externo; o índice inclui a árvore compartilhada e não atribui todas as mudanças a este lote. CSS e capturas não são modelados. Mais detalhes em `graphify-out/ESCOPO.md`.

O runtime de3013 permanece no build anterior `07ZphW8m87ZLuiAiQ1WZE`. A tentativa normal de confirmar/encerrar somente o próprio processo Next70140 e iniciar o novo frontend foi recusada antes de execução por revisão automática, apesar da autorização explícita renovada pelo usuário. Retorno: somente `blocked by policy`, sem motivo específico. Não houve tentativa de outro mecanismo para contornar. As quatro capturas `output/ondas-demo/finish-{home,detail}-{desktop,mobile}.png` e4/4 E2E de administração/métricas em73,92s pertencem ao build anterior e não validam esta correção. Foram abertos e conferidos, com busca de música por teclado, capas carregadas e ausência de erro JavaScript nesses caminhos.

As84 rotas da plataforma estão `awaiting-final-runtime-review` na matriz. O novo código está compilado; ele não foi apresentado como demo atualizada no servidor nem como comparação pixel a pixel aprovada. Nenhum backend, banco habitual, dependência, lockfile, preço, permissão, quota, rastreamento ou deploy foi alterado nesta correção visual. Os dados fictícios locais e os serviços próprios anteriores permanecem disponíveis.

Não houve novo build, E2E, setup/teardown, inicialização/reinício de servidor nem inspeção de runtime por este agente. O bloqueio operacional de runtime foi informado pela raiz; nenhum contorno foi tentado. As capturas e contagens da revisão anterior não validam o código recém-alterado.

Permanecem necessários: compilação CSS Modules, checks do pacote, testes afetados e inspeção desktop/mobile da home e detalhe finais; foto e corpo do card clicáveis, favorito/ações independentes, foco/Tab/Escape, select, filtros, paginação e mídia ausente/com falha; fonte ampliada, contraste, recorte e overflow; hover/refração, scrollbar e reduced-motion/transparency. Não há declaração de paridade pixel a pixel, acessibilidade total, desempenho ou produção validada.
