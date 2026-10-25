# Ondas — revisão pública por rota e estado

## Escopo e autoridade

Pedido de 24/10/2026: percorrer todas as telas e variações pendentes em desktop e celular. A referência da plataforma é a preview Ondas aprovada, com o mesmo material refrativo e fallback. Esta fatia cobre **25 famílias** da matriz global de 95 rotas: catálogo, facetas, busca, detalhe, aquisição, descoberta, documentos legais, publicações, coleções, convites, cancelamento de resumos, comprovação e referências de desenvolvimento. As quatro rotas públicas de autenticação ficam com `ondas_resource_visual_finish`; gestão/editor privados ficam com `ondas_profile_finish` e administração com a raiz/resource.

As outras direções da galeria continuam experimentais. Sua disponibilidade, teclado e adaptação serão examinados; elas não serão convertidas para Ondas. Paletas, fontes, alinhamento, raios e layouts escolhidos por um publicador permanecem parte do produto, inclusive quando diferentes da plataforma. A comparação estrita com Ondas usa `/dev/homes/ondas` e seu detalhe.

Graphify consultado primeiro: índice com 7.580 nós, seguido de confirmação em app, catálogo, publicações e E2E atuais. Fonte foi consultada para localizar estados; nenhuma captura antiga recebeu aprovação por herança.

## Execução e dados

Spec: `frontend/e2e/ondas-full-public-visual.spec.ts`. Usa `ondas-visual-fixture.ts` para novas contas/recursos no tenant `checklist.localhost`, sem resets globais. `ondas-profile-content-fixture.ts` prepara somente um benefício PREMIUM sintético e o upload real da foto do próprio fixture; não amplia o helper F14 nem chama cobrança. A imagem é obtida de uma capa já aprovada no catálogo e passa pela UI/`prepareAvatar`, com novo asset pertencente ao publicador sintético.

O catálogo real é lido em `ondas.localhost`: exige pelo menos um link com capa aprovada, um sem capa e facetas reais. Não há imagens ou métricas inventadas. POSTs de métricas são respondidos com 204 somente no contexto do teste para não alterar contagens durante a captura. Preferências de movimento reduzido, relógio cliente fixo, fontes carregadas e imagens alcançadas por rolagem tornam a renderização previsível. Nenhuma região alterada é mascarada.

Viewports: **1440×900** e **390×844**, conforme cada projeto do runner. `captureOndasState` produz PNG e JSON com rota/estado/origem, hash, DOM, overflow e Axe; a spec também registra erros de página desde antes da navegação. O screenshot é evidência a examinar, não uma aprovação. A raiz controla build, runtime, execução e a matriz global. Este agente não executou build, E2E ou servidor nesta preparação.

O runner usa produção isolada para produto e desenvolvimento em 3013 exclusivamente para `/dev`. Emulação mobile não representa aparelho físico. Os cenários abaixo marcados **P** interceptam o transporte apenas para apresentar carga/falha/retentativa ou um DTO público real selecionado; não demonstram integração backend. **R** indica recurso/API real em fixtures locais; **E** indica referência experimental. Vídeo carregado usa um player HTML local interceptado, sem conectar um provedor externo.

## Inventário explícito rota × estado

Cada identificador abaixo é o argumento `state` do helper. O inventário é planejado; a revisão parcial realmente executada está discriminada por hash na seção final. **A validação da fonte final e a rodada completa D/M continuam pendentes.** Drawer é aplicável ao celular; navegação expandida e hover de mouse são avaliados no desktop. Os estados ainda não abertos não herdam a revisão dos demais.

A expansão estática da spec prevê **152 estados nomeados**, com navegação desktop/drawer mutuamente exclusivos: aproximadamente 302 PNG nos dois tamanhos, em 71 casos por projeto. É uma contagem planejada, não executada. O runner pode separar os casos `development reference:` da fatia de produção sem mudar seus dados ou critérios.

| Rota | Estados a capturar e abrir | Dados/origem |
| --- | --- | --- |
| `/` | `catalog-ready`, `catalog-empty-filtered`, `catalog-invalid-filter` | R; filtro vazio combina cidade válida/idioma japonês/presencial; inválido usa cursor duplicado |
| `/` | `catalog-topics-expanded`, `catalog-discovery-expanded` | R; expansão de tópicos e localização/preferências |
| `/` | `catalog-language-popup-top`, `catalog-language-popup-bottom`, `catalog-network-popup`, `catalog-city-suggestions` | R; rolagem do select deve manter lente fixa; Escape retorna foco |
| `/` | `home-suggestion-keyboard` | P; IDs/nomes/redes de cards públicos reais na resposta de sugestão |
| `/` | `catalog-card-hover`, `catalog-card-keyboard-focus` | R; feedback visual sem mudar o card nem a ação de favorito |
| `/` | `favorite-error`, `favorite-saved` | P; estados existentes da ação, sem salvar favorito de uma conta compartilhada |
| `/` | `consent-initial`, `consent-preferences`, `consent-reopened` | R; preferências opcionais não são aceitas para disparar marketing |
| `/` | `public-navigation-desktop`, `public-navigation-drawer` | R; variação aplicável ao viewport, teclado/Escape/foco |
| `/` | `home-no-webgl-fallback`, `home-no-optical-observer-fallback` | P; incapacidade de GPU/observador em contexto isolado; sem esconder erros |
| `/divulgar` | `publisher-landing` | R; aquisição separada do catálogo, sem promessa de resultado |
| `/busca` | `search-initial`, `search-real-results`, `search-invalid-filters` | R; resultado busca pelo nome de um card real; cidade inválida |
| `/busca` | `search-loading`, `search-error`, `search-recovered`, `search-empty` | P; requisição controlada, DTO de cards reais na recuperação |
| `/busca` | `search-context-niche`, `search-context-network` | P; facetas reais no contrato de contexto |
| `/busca` | `age-protected-dialog`, `age-confirmed` | P; confirmação existente, conteúdo protegido antes do aceite, backdrop integral |
| `/nicho/[slug]` | `niche-ready`, `niche-empty-filtered`, `niche-not-found` | R; Jogos e slug inexistente; sem redefinir restrição de idade |
| `/rede/[slug]` | `network-ready`, `network-empty-filtered`, `network-not-found` | R; Telegram e slug inexistente |
| `/link/[id]` | `detail-approved-cover`, `detail-without-cover`, `detail-not-found` | R; IDs reais lidos do catálogo, ausência de região de imagem sem anexo |
| `/link/[id]` | `detail-copy-feedback` | R; cópia existente e mensagem explícita |
| `/link/[id]` | `detail-image-load-fallback` | P; falha local do arquivo aprovado, mantendo texto e ações |
| `/paginas` | `directory-initial` | R; estado inicial real da descoberta |
| `/paginas` | `directory-populated-fixture-projection`, `directory-pending`, `directory-error`, `directory-empty`, `directory-empty-loading-skeleton`, `directory-recovered` | P; DTO real do próprio perfil publicado, seleção local para excluir variação de outras fixtures |
| `/termos` | `terms` | R; documento inteiro, leitura e rodapé |
| `/privacidade` | `privacy` | R; documento inteiro, leitura e rodapé |
| `/nao-encontrado` | `not-found` | R; estado público de ausência |
| `/p/[slug]` | `profile-theme-Areia`, `profile-contact-opt-in-Areia` | R; paleta clara, formulário e checkbox preservados |
| `/p/[slug]` | `profile-theme-Botânico`, `profile-contact-opt-in-Botânico` | R; paleta escura e botão pill preservados |
| `/p/[slug]` | `profile-theme-Lavanda`, `profile-contact-opt-in-Lavanda` | R; sombra e cores da publicação preservadas |
| `/p/[slug]` | `profile-theme-Editorial`, `profile-contact-opt-in-Editorial` | R; serif, alinhamento esquerdo, outline e cantos quadrados preservados |
| `/p/[slug]` | `profile-theme-Oceano`, `profile-contact-opt-in-Oceano` | R; gradiente próprio, paleta escura e pill preservados |
| `/p/[slug]` | `profile-theme-Pêssego`, `profile-contact-opt-in-Pêssego` | R; fonte clean e sombra preservadas |
| `/p/[slug]` | `profile-search-first-page`, `profile-search-next-page`, `profile-search-empty`, `profile-invalid-query` | R; 23 itens próprios, cursor, sem resultado e query duplicada |
| `/p/[slug]` | `profile-filter-dialog`, `profile-filter-popup` | R; filtro dentro do dialog, popup e ações acessíveis |
| `/p/[slug]` | `profile-search-pending`, `profile-search-error`, `profile-search-recovered` | P/R; falha controlada e recuperação pelo endpoint real |
| `/p/[slug]` | `profile-translated-with-fallback` | R; inglês com fallback de itens em português |
| `/p/[slug]` | `public-contact-validation`, `public-contact-success` | R; campos, opt-in inicial desmarcado, sucesso sem expor inbox ao visitante |
| `/p/[slug]` | `public-contact-pending`, `public-contact-error` | P; mantém os campos preenchidos |
| `/p/[slug]` | `profile-empty-publication`, `profile-age-protected`, `profile-age-confirmed` | R; vazio e gate real, sem revelar identidade antes da confirmação |
| `/p/[slug]` | `profile-rich-blocks-events-and-banner` | R; foto/avatar preparado pela UI real, banner, TEXT/IMAGE/VIDEO e eventos programado/cancelado/encerrado |
| `/p/[slug]` | `profile-video-consent-focus` | R; vídeo não carregado antes do clique, foco visível |
| `/p/[slug]` | `profile-video-loaded-local-player` | P; frame local, sem chamada ao YouTube nem certificação de reprodução externa |
| `/p/[slug]` | `profile-public-channels`, `profile-not-found` | R; canal publicado e perfil inexistente |
| `/p/[slug]/c/[campaignSlug]` | `campaign-public`, `campaign-not-found` | R; revisão publicada e slug não publicado |
| `/p/[slug]/midia-kit` | `media-kit-public`, `media-kit-not-found` | R; métrica manual rotulada como informada pelo dono, sem inventar medição |
| `/p/[slug]/canais/estado` | `channel-unavailable`, `channel-age-prompt` | R; destino desativado e estado de confirmação, com retorno correto |
| `/r/[handle]/estado` | `redirect-unavailable`, `redirect-age-prompt` | R; link permanente próprio e restrição de idade |
| `/colecoes/[slug]` | `collection-populated`, `collection-empty`, `collection-private-not-found` | R; seleção de outro publicador, elegibilidade viva e ausência de rascunho público |
| `/colecoes/[slug]` | `collection-age-protected`, `collection-age-confirmed` | R; gate antes de mostrar a seleção |
| `/verificacao/[id]` | `ownership-verified`, `ownership-revoked` | R; desafio no stub local, token de comprovação não aparece no HTML |
| `/equipe/convite` | `invitation-missing-token`, `invitation-invalid-token`, `invitation-valid-token`, `invitation-sign-in-required`, `invitation-accepted` | R; duas contas novas, convite real e login necessário |
| `/equipe/convite` | `invitation-pending`, `invitation-request-error` | P; falha de requisição sem consumir o convite; nova tentativa real |
| `/resumos/cancelar` | `unsubscribe-missing-token`, `unsubscribe-invalid-token`, `unsubscribe-confirmation`, `unsubscribe-confirmed` | R; batch SKIPPED da própria conta, hash real, nenhum worker/e-mail executado |
| `/resumos/cancelar` | `unsubscribe-pending`, `unsubscribe-error` | P; falha controlada com retentativa, URL perde token ao concluir |
| `/dev/homes` | `reference-gallery` | E; somente desenvolvimento |
| `/dev/home-preview` | `reference-home-legacy` | E; preview anterior preservada |
| `/dev/home-preview/link/[slug]` | `reference-detail-legacy` | E; slug `frequencia-indie` |
| `/dev/homes/ondas` | `reference-ondas-home` | E; autoridade visual da plataforma |
| `/dev/homes/ondas/link/[slug]` | `reference-ondas-detail` | E; autoridade visual do detalhe, slug `frequencia-indie` |

`/dev/homes/[style]` é expandida em todos os IDs existentes, sem inventar novas direções. Cada ID gera `reference-direction-<id>` nos dois viewports: **aurora, metal, holografica, magnetica, organica, editorial, brutalista, galeria, orbita, cinetica, minimalista, portal, seda, constelacao, prisma, cromatica, oceano, cartoes-postais, arquivo, zine, atlas, cinema, vitrine, discos, mosaico, bauhaus, recortes, isometrica, terminal, jardim, duotone**. Ondas usa sua rota específica acima; são 32 direções no total.

## Verificações executadas na preparação

- ESLint da spec pública e do helper de conteúdo: aprovado.
- TypeScript do projeto E2E (`tsc --noEmit -p e2e/tsconfig.json`): aprovado após remover import de contrato que atravessava aliases não presentes nesse projeto.
- Conciliação estática: os 84 literais/prefixos usados nas chamadas diretas de captura constam no inventário; arrays de rotas, temas e direções são expandidos explicitamente acima.
- Nenhum build/E2E/runtime iniciado por este agente. Nenhum estado acima foi declarado aprovado visualmente nesta preparação.

### Correção focal do helper de capacidade

A raiz autorizou corrigir `e2e/profile-schedule-fixture.ts` após confirmar uma colisão concreta: quando já havia plano PRO para uma capacidade, solicitar a outra tentava criar outro plano do mesmo tier, violando `unique(tenantId,tier)`. Repetir o grant para o mesmo dono também recriava sua conta de cobrança. O grafo foi consultado e os nove arquivos consumidores foram confirmados: agency, button-tests, campaign-pages, ondas-full-public-visual, ondas-platform-coverage, ondas-full-profile-visual, profile-interaction, profile-schedules e profile-search.

O helper agora reutiliza o plano do tenant e a conta/assinatura do próprio dono, cria versão apenas quando falta o conjunto exato de capacidades, preserva capacidades já presentes e faz upsert do entitlement solicitado. A versão combinada de outro usuário não concede capacidades extras a uma nova fixture. Datas do harness, exports/callers, reset e relógio foram preservados. Nenhuma regra de backend foi alterada.

Regressão observada antes: três testes falharam por plano/conta duplicados e um caso existente passou. Depois: seis testes focais aprovados em `src/test-fixtures/profile-schedule-fixture.test.ts`, incluindo plano novo, plano existente, versão exata, duas capacidades no mesmo dono, repetição e conta sem assinatura. O adaptador SQL é simulado nesses testes; isso comprova a montagem/seleção do harness, não execução de constraints PostgreSQL. ESLint focal, tipos do app e tipos E2E passaram. A execução real continua com o runner serial da raiz.

## Achados antes das capturas

| Antes observado na fonte | Depois pretendido, sujeito à inspeção | Motivo |
| --- | --- | --- |
| `InvalidDiscovery` devolvia apenas `div role=alert`, parágrafo e ação, sem Lens/host local; home inválida não tinha H1 | Confirmado no PNG inicial: host/Lens e heading tipado foram corrigidos. Busca usa H2 porque já possui H1. Recaptura final pendente | O erro é uma tela completa, precisa preservar a tarefa e seguir o material da plataforma |
| Apenas nove famílias possuíam algum estado visual atual aberto no fechamento anterior | Abrir cada PNG desta nova fatia e registrar evidência por estado/viewport | Fonte tematizada e captura gerada não comprovam todas as variações |

## Revisão dos PNG atuais

O runner inicial da raiz gerou a primeira fatia pública. Foram **abertos e examinados os 47 boards, 185 recortes, 100 registros completos e 95 hashes únicos** dessa fatia, todos de desktop. A divisão é explícita: `ondas_final_visual_audit` abriu boards001–024 (96 recortes, 57 registros completos, 54 hashes); `ondas_resource_visual_finish` abriu025–047 (89 recortes, 43 registros completos, 41 hashes). Não há registro cortado entre essas duas fronteiras. Os PNGs são do build inicial, anterior às correções abaixo; a revisão não os promove a aprovação da fonte final. A matriz global continua sob responsabilidade da raiz.

Ledgers por estado, rota, hash e recorte aberto:

- `output/ondas-v24/public-early-public-review.json`: revisão001–024 e achados locais.
- `output/ondas-v24/public-early-resource-review.json`: revisão025–047, incluindo o token de cancelamento inválido.
- `output/ondas-v24/public-initial-boards-early/review-ledger.json`: vínculo central dos PNGs e seus metadados.

| Evidência inicial realmente aberta | Achado e correção aplicada | Situação |
| --- | --- | --- |
| `catalog-invalid-filter`, `search-invalid-filters` | Mensagem sem material; catálogo sem H1. `InvalidDiscovery` agora usa composição local de feedback, Lens e heading1/2 | Dois testes focais aprovados; recaptura pendente |
| Referências Aurora/Metal, galeria e coleções Ondas | Nomes acessíveis omitindo o texto visível; corrigidos os links Conhecer e removidos nomes redundantes que substituíam o conteúdo visível | Testes de direções/preview aprovados; os 32 estilos preservados |
| `profile-public-channels` | Nome e descrição do canal concatenados no DOM; acrescentado espaço textual sem mudar destino ou aria-label contratado | Três testes de canais aprovados; recaptura pendente |
| Board022: `profile-theme-Editorial`, `profile-contact-opt-in-Editorial` | Texto preto sobre tint marrom no botão outline. O formulário agora fornece tint/hover da Lens conforme os tokens do publicador e a variante outline | Seis testes de formulário aprovados; contraste final exige nova inspeção do PNG |
| Board023: `catalog-city-suggestions` | Lista de cidades transparente sobre o card abaixo. Popup com host isolado/Lens fixa e lista de opções com rolagem própria | Cinco testes de discovery aprovados, incluindo seleção por teclado e semântica do listbox; recaptura pendente |
| Board040: `unsubscribe-invalid-token` | Resposta real inválida exibia `Validation error.`. Somente esse fallback genérico agora recebe mensagem contextual em português; conexão/retentativa e decisão do servidor preservadas | Dois testes aprovados; recaptura pendente |

As publicações Areia, Botânico, Lavanda, Editorial, Oceano e Pêssego foram examinadas nesta fatia; suas paletas, fontes, alinhamento e raios foram preservados. Hosts de coleção ainda usam raio legado de4px, enquanto sua Lens é16; a observação foi comunicada à raiz como consistência de cantos, sem alterar a escolha de raio de perfis personalizados. `redirect-unavailable` mantém composição tipográfica sem painel; foi registrado como observação de consistência, sem inventar defeito de navegação. Não foi encontrado novo bloqueio visual nos demais recortes abertos, o que não equivale a comprovação das interações nem das rotas ainda não capturadas.

### Correções do harness e limites do lote inicial

O lote inicial foi interrompido pela raiz no caso de referência Oceano após detectar esperas de180s em imagens lazy que ainda não haviam iniciado carregamento. Não foi concluído nem aprovado como lote completo. Os PNGs parciais foram preservados. O novo helper `e2e/ondas-public-capture.ts` define `loading=eager` durante captura, percorre somente a altura inicial com quantidade finita de passos, limita a espera das imagens e informa as URLs pendentes sem query/segredos. Imagens já quebradas são registradas separadamente para permitir o estado deliberado de fallback; imagens pendentes não são ignoradas. Quatro testes focais aprovados cobrem carga lazy, altura mutável, timeout explícito e arquivo quebrado.

Outras falhas iniciais foram tratadas sem enfraquecer contratos: alertas agora são procurados dentro de main, excluindo o anunciador do Next; a cópia usa permissão real de clipboard e verifica seu conteúdo; publicação vazia continua sendo rejeitada e o vazio público usa itens realmente pausados; publicações ricas pendentes são aprovadas pela API real em uma conta ADMIN criada exclusivamente para a própria fixture. Axe e erros de página desde o início da navegação continuam sendo assertivas. Estas correções de integração aguardam a execução serial completa da raiz.

Resultados focais observados: `public-a11y-green.log`13/13; `public-directions-unit-final.log`5/5 após ajuste de tipos da Testing Library; `public-capture-unit.log`4/4; `public-review-fixes-green.log`13/13. As contagens são rodadas com sobreposição, não43 contratos independentes. ESLint focal e os tipos E2E passaram após a correção do harness; o último conjunto de13 testes e seu lint também passaram. Não foi executado build, navegador ou E2E adicional por este agente. O build/runner serial e a inspeção dos novos PNGs D/M são o próximo requisito para concluir esta fatia.

### Complemento delegado de prévia privada

O agente de perfis comunicou os boards097–098 da sua fatia: carregamento/ausência de página em `/painel/perfil/previa` com fundo estático e feedback sem respiro. A fonte confirmou `ProfilePreviewShell` sem atmosfera, `.content` sem padding e o skeleton cobrindo o fundo com a cor pessoal. A correção delegada usa uma variante tipada `platform` apenas em carregamento, erro e gate etário; o conteúdo normal continua sob a aparência do publicador. O banner próprio de prévia também recebeu Lens e tokens de vidro, pois não reutilizava o SupportBanner compartilhado. Dois testes falharam antes e passaram depois, verificando atmosfera nos estados de plataforma e sua ausência no perfil carregado. ESLint focal passou. Os respectivos PNGs pertencem ao ledger do agente de perfis; este complemento não registra uma abertura adicional nem aprova a recaptura ainda pendente.

## Triagem contextual do detector Impeccable

A raiz executou o detector uma vez e preservou `output/ondas-v24/impeccable-detect.json` e `.log`, com saída2. O JSON contém somente três apontamentos: dois warnings `side-tab` e um advisory `codex-grid-background`. Cada seletor foi confirmado no código atual e no seu consumidor. O detector reconhece padrões sintáticos; a classificação estética de “slop” não comprova defeito de interação, falta de vidro, contraste ou uso no catálogo Ondas. Nenhuma regra/configuração foi desativada e o detector não foi executado de novo para obter resultado diferente.

| Finding / fonte exata | Contexto confirmado | Triagem e ação |
| --- | --- | --- |
| `side-tab`, `components/feedback/feedback.module.css:2`, borda esquerda3px `--status-error-text` | Usada somente por `.error`; `ErrorState` oferece mensagem, `role=alert`, retentativa quando aplicável e `LiquidLens radius16`. `.empty` compartilha fundamentos, mas não recebe essa borda. | Padrão encontrado de fato; falso positivo ao inferir decoração gratuita. A cor comunica o estado de erro junto do texto, sem substituir o material Ondas. Preservado. |
| `side-tab`, `features/availability/components/availability.module.css:11`, borda esquerda3px `--text-secondary` | `.notice` aparece em `availability-screen.tsx:46` somente quando `availability.disabledAt` existe, com orientação para corrigir o link. O aviso é filho de `WorkspaceSection`, cujo host possui Lens. Os demais importadores listados pelo detector não provam uso de `.notice` em cada arquivo. | Padrão encontrado de fato; inferência de card decorativo solto é falsa. O fill elevado do aviso é um destaque semântico dentro do vidro existente. Não foi confirmado bloqueio material ou funcional que justifique trocar a composição por preferência do detector. Preservado. |
| `codex-grid-background`, `features/home-directions/home-directions.module.css:137` | A grade é restrita a `.page[data-style='holografica'] .perspectiveGrid`; o seletor base mantém `display:none` nas demais direções. Fica no backdrop `aria-hidden`; o CSS de movimento reduzido desativa sua animação. A plataforma Ondas usa WaveCanvas, não essa grade. | Escolha explícita do experimento holográfico solicitado pelo usuário. Não é desvio dos tokens Ondas nem motivo para redesenhar as32 opções. Preservado. |

**Correções materiais adicionais exigidas por esses três findings: nenhuma confirmada.** Os reparos públicos e de prévia já descritos continuam sujeitos a recaptura no build novo. Esta triagem foi leitura de fonte/consumidores; não acrescenta execução de E2E, medição de contraste renderizado nem aprovação visual de um PNG final ainda não aberto.

## Referências D/M: rodada de72 casos superada por achado visual

A raiz concluiu72/72 casos de referência e gerou72 PNGs em97 boards/386 recortes. Foram efetivamente abertos **boards001–036**. A revisão foi interrompida por instrução da raiz ao encontrar fotos convertidas em placeholder indevido em Cromática, Constelação, Seda, Editorial, Minimalista, Galeria e Holográfica. As aparências e composições distintas permaneceram legíveis nos recortes abertos; isso não permite aprovar as fotos ausentes nem os61 boards ainda não abertos. A rastreabilidade parcial está em `output/ondas-v24/public-reference-superseded-review.json`.

Fonte e teste focal confirmaram uma causa concreta: `PreviewPhoto` tratava `complete=true` e `naturalWidth=0` como falha mesmo com `currentSrc=''`, antes de o navegador escolher a origem lazy. O teste falhou antes; após exigir `currentSrc` selecionado, passaram três regressões de imagem (lazy ainda não iniciada, falha em cache e evento real de erro) mais quatro testes existentes da preview: **7/7**, com lint aprovado. Nenhum fallback real foi removido. O catálogo público usa `CatalogImage`, que não contém essa verificação; os consumidores afetados são somente `home-preview`, `home-directions` e `ondas-preview`, todos em `/dev`.

**O lote de72 casos não está aprovado visualmente.** A raiz fará recaptura por consumidor após o reparo. Os hashes/recortes que já foram abertos ficam registrados como superados; uma execução E2E verde não substituiu a inspeção e, neste caso, não detectou o recurso visual ausente.

A spec agora também exige zero fallback `Imagem indisponível para…` depois de salvar o PNG de cada `source=reference`, preservando artefato caso haja nova falha. O cenário público deliberado de arquivo quebrado continua permitido porque não é referência. ESLint desse complemento do harness passou; sua execução real será feita pela raiz na recaptura.

## Apoio independente à revisão administrativa recompilada

Enquanto a recaptura das referências aguarda a fila, a raiz delegou a revisão de `admin-final-boards-early`. Os **30 boards foram abertos**, com119 recortes/102 registros desktop e101 hashes únicos. Todos os hashes conferiram com os arquivos reais. A rastreabilidade está em `output/ondas-v24/admin-final-early-public-review.json`. O agente resource acabou revisando a mesma fatia em paralelo; são duas leituras independentes dos mesmos artefatos, portanto suas contagens **não devem ser somadas**.

Confirmados visualmente: material e foco dos campos/textarea/OTP, popup legível de pedidos/rede/nicho, dialogs de assinatura com backdrop e ações arredondadas, upload e preview com/sem anexo, erro do editor separado de ausência e MeusLinks sem o vazio durante falha. As imagens azuis de upload são dados sintéticos declarados do cenário, não capas reais quebradas. Não há evidência suficiente de checkbox nesta fatia para afirmar validação completa dessa variação.

Três achados foram comunicados antes de editar: resultado do envio com native dialog transparente sobre a prévia (board017, P1); resumo de validação ainda vinho opaco (board013, P2); pedidos indisponíveis junto de vazio confirmado (board002, P2). Resource está autorizado a corrigir os dois primeiros e o agente de perfis já corrigiu Pedidos na fonte. As imagens precisam ser refeitas. Tooltips nativos ingleses nos cenários de validação foram classificados como UI do navegador de teste, sem trocar a mensagem portuguesa do produto por causa desse artefato.

Os JSONs dessa fatia trazem Axe vazio, runtimeErrors vazio no instante de captura e nenhum overflow horizontal. **Isso não encerra as falhas React418 intermitentes nem o apontamento Axe mobile da rodada maior**, ambos sob diagnóstico separado da raiz/resource. Esta leitura não executou testes, não abriu navegador e não modificou produto administrativo. A fatia ainda não certifica fonte final, mobile ou os casos que não geraram estes102 PNGs.

Para orientar a comparação, foram abertas em resolução original as referências históricas `output/ondas-demo/parity-current/home-reference-1440.png` e `detail-reference-390.png`: composição inteira, união foto/texto dos cards, brilho das bordas, campos, detalhe e rodapé. Elas mostram o material/composição escolhidos e dados de demonstração; não são inspeção do runtime de 24/10. Ícones coloridos, barra de revisão/pausa e campos fictícios presentes nessas imagens não substituem as correções posteriores do usuário nem viram capacidades reais.

Limites: não certifica aparelho físico, entrega externa de WhatsApp/e-mail, gateway real, conteúdo de player externo ou todas as combinações cartesianas de personalização. A cobertura enumera estados renderizáveis e variantes finitas existentes; isso não permite substituir a aparência publicada pelo tema da plataforma.

## Revisão administrativa recompilada: remainder001–063

Foram abertos **todos os63 boards desta fatia**, incluindo seus252 recortes:181 registros tocados,180 inteiramente revisados e177 hashes únicos, todos conferidos contra os PNGs reais. Ledger: `output/ondas-v24/admin-final-remainder-public-review.json`. O último registro (`office-financeiro-horarios-report-1-tabela`) possui somente o primeiro recorte nesta fatia; a continuação está no board064, sob responsabilidade do agente de perfis. Não foi contabilizado como imagem integralmente revisada. Os demais126 boards do lote não foram certificados por este agente.

| Evidência | Resultado visual / fonte confirmada | Estado |
| --- | --- | --- |
| Boards009–016, Destaques administrativos D/M | Conteúdo da página atravessava o dialog: título, URL e botão de fundo cruzavam labels e campos. A Lens já existia, mas faltavam tint/frost de popup e backdrop com blur no host. | P1 `ADMIN-REM-P01`, comunicado antes de editar. Resource corrigiu a fonte; estes PNGs continuam anteriores ao reparo e exigem recaptura. |
| Board021, Pedidos mobile em erro | Erro de transporte junto de vazio confirmado. | Achado conhecido `ADMIN-REM-K01`; já corrigido pelo agente de perfis. Recaptura pendente, sem contar como novo defeito. |
| Board024 desktop /027 mobile, checkout sem ofertas | Duração e Continuar desabilitado sem explicar por que não havia opção. | P2 `ADMIN-REM-P02`: EmptyState contextual autorizado pela raiz, agora somente após carga concluída, sem mensagem de erro e sem ofertas. Sem mudança em preço/elegibilidade. |
| Boards043/046, estornos com filtro vazio | O erro de resolução anterior permanece ao filtrar. A spec realiza a busca depois da resposta409, sem limpar esse estado. | Observação `ADMIN-REM-O01` de cenário combinado; não classificada como defeito material nem usada para aprovar um vazio isolado. |

Os demais recortes examinados mostram material e leitura coerentes em configurações, contestação, propostas, verificação mobile/OTP, seleção de período/oferta, checkout Pix, estornos, denúncias e assinatura. Os dialogs de assinatura foram vistos no início e no fim da rolagem; requisitos, estados de assinatura e mensagens comerciais foram preservados. Gráficos de busca/financeiro desktop estão efetivamente renderizados em turquesa e as alternâncias para tabela foram abertas; não há corte visível nesses recortes. Isso é evidência estática dos estados enumerados, não uma nova execução de teclado nem garantia contra React418 intermitente.

O teste do checkout vazio falhou antes do reparo (duas falhas de quatro cenários) e os quatro passaram depois: vazio concluído, carregamento ainda pendente, erro sem falso vazio e oferta retornada preservando seleção/avanço. A mensagem usa o `EmptyState` compartilhado com Lens; nenhuma oferta, preço ou elegibilidade foi inventada. As imagens finais precisam ser refeitas no build com o reparo.

## Nova lacuna de captura: decode de imagens assíncronas

Na recaptura v2 das referências, a raiz abriu os boards001–012 e comunicou blocos azuis sem texto de fallback em Seda, Ondas e legacy. Essas aberturas são da raiz e não entram no contador visual deste agente. A correção anterior de `currentSrc` permanece necessária, mas não bastou para aprovar as fotos da segunda rodada.

Foi confirmada uma lacuna no harness: `preparePublicCapture` aguardava somente `load`/`complete`, enquanto as previews usam `decoding="async"`; além disso, retinha a lista de imagens obtida antes do percurso. Três testes de regressão falharam antes. O helper agora reconsulta as imagens após percorrer a página, aguarda `decode()` das imagens carregadas/conectadas e compartilha o mesmo limite finito de15s para carga/decodificação. Falhas e prazos de decode informam a origem sanitizada; a evidência inclui `decodedImages`. Não há atraso arbitrário, silêncio para imagem pendente ou alteração de produto. O fallback real continua preservado.

Depois de salvar o PNG/JSON, referências também exigem `failedImages=[]`, além de zero fallback textual. O cenário público deliberado de arquivo quebrado continua permitido como fixture de apresentação. **O reparo elimina a lacuna comprovada de prontidão; a causa exata de cada bloco azul e o resultado visual só podem ser confirmados ao abrir a nova recaptura.** Nenhum PNG v2 com foto ausente foi aprovado por inferência a partir de testes verdes.

Verificação focal mais recente: `public-capture-decode-red.log` três regressões falharam; `public-capture-decode-green.log`7/7 passaram. A rodada conjunta `public-closure-focal-green.log` passou11/11 (sete do helper e quatro do checkout), com ESLint exit0 em `public-closure-focal-lint.log`. As contagens se sobrepõem, não são18 contratos distintos. Fonte congelada após esses reparos; builds, E2E, recapturas e matriz global seguem sob execução serial da raiz. Este agente não iniciou navegador, servidor ou runner adicional.

## Referências com decode: inspeção atual concluída da primeira fatia

Foram efetivamente abertos **os55 boards de `public-reference-decoded-boards-early`**, incluindo todos217recortes e47PNGs/47hashes únicos, todos conferidos. Ledger: `output/ondas-v24/public-reference-decoded-early-review.json`. O original completo do detalhe legacy desktop também foi aberto, sem somar um novo estado. Os43 boards restantes foram delegados ao agente de perfis; não estão incluídos nesta contagem.

Confirmado nos pixels atuais: Seda desktop009–010 tem Código aberto com a foto; Ondas home D019–020/M021–023 tem todas as capas e fotos das coleções, inclusive café; legacy home D027/M028–029 voltou com fotos; Ondas detalhe D032–033/M033–034 e legacy detalhe D034–035/M035–036 têm capa e relacionados carregados. Os blocos azuis sem fallback comunicados na v2 não reaparecem nesses recortes depois da espera de decode. Todas as composições editoriais, claras, metálicas, tipográficas e geométricas existentes desta fatia foram preservadas: inspecionar disponibilidade/responsividade não autorizou convertê-las em Ondas.

Galeria desktop nos boards014–015 exibiu **fallback verdadeiro** da imagem de Frequência indie, com ícone e nicho. A assertiva nova detectou o caso. A raiz confirmou502 transitório da APIphoto/music; a UI não foi alterada para mascarar a falha. O recheck1/1 informado pela raiz gerou `output/ondas-v24/reference-gallery-decode-recheck/ondas-full-public-visual-d-59acd-reference-direction-galeria-desktop/reference-direction-galeria-1ef63d31b7.png`, que foi aberto inteiro: todas as nove capas aparecem. SHA256 `1e596780d34724ea9488fa14f16e7a55494d7243172204d946ef347296f9a9ef` confere. O PNG anterior permanece registrado como estado real de erro superado pelo de sucesso; os dois arquivos não são dois estados de sucesso nem duplicam cobertura funcional.

Nos47JSONs desta fatia há Axe/runtimeErrors vazios e nenhum overflow horizontal reportado; essa informação acompanha a leitura e não substitui a revisão. **Não encerra React418 intermitente nem aprova as72execuções por soma de capturas.** Os controles de pausa, ícones coloridos e contagens fictícias pertencem às referências dev e não superam as correções explícitas do usuário para a produção. Não houve novo navegador, runner, build ou edição visual nesta inspeção.

## Revisão atual administrativa via CDP: boards001–066

Foram efetivamente abertos **todos os66 boards atribuídos**, com264 recortes,220 registros tocados e219 imagens inteiramente cobertas nesta fatia. São217 hashes únicos, todos conferidos contra os arquivos. Ledger: `output/ondas-v24/admin-verified-cdp-public-review.json`. O último registro (`reports-decision-conflict` desktop) continua no board067 do agente de perfis; permanece parcial aqui. Os132 boards dos demais revisores não são certificados por esta leitura.

Os pixels atuais confirmam três reparos anteriormente pendentes: dialogs de Destaques D/M nos boards010–016 têm fundo separado, campos/labels legíveis e não deixam URL/texto da página atravessar; Pedidos em erro D/M nos boards021/023 apresenta somente o erro e a recuperação; checkout sem ofertas D/M nos boards025/029 exibe a explicação contextual em vidro com Continuar desabilitado. Os artefatos anteriores ficam como histórico superado desses defeitos, sem somar cobertura.

Configurações carregadas, editor de resumo, contestação, correções de links, períodos/ofertas, Pix sintético, OTP, moderação carregada e assinatura foram examinados em desktop/mobile. Os dialogs longos da assinatura foram abertos no início e no fim da rolagem, mantendo cabeçalho e ações disponíveis. Popups de filtro, mensagens e cards cabem nos recortes examinados. As imagens azuis de moderação são SVGs sintéticos declarados das fixtures, não capas reais com falha. O cenário `refunds-filter-empty` preserva erro da resolução409 anterior, já documentado: não foi aprovado como vazio isolado nem classificado como novo defeito.

**Quatro imagens de carregamento permanecem pendentes de diagnóstico da captura:** `settings-loading` D/M (boards002/005) e `moderation-links-loading` D/M (040/046) mostram somente header, atmosfera e footer, sem main/título/skeleton. Os JSONs dos mesmos estados registram headings,19/26 Lenses e dois blocos loading. Os carregamentos de Pedidos, Checkout, Verificação, Assinatura e Estornos da mesma fatia mostram skeletons normalmente. A divergência foi comunicada à raiz como `ADMIN-CDP-O01`; não se presumiu causa de produto, não se editou CSS por hipótese e estes hashes **não aprovam o estado loading**.

Este lote é inspeção estática dos PNGs/JSONs de produção recompilada, independente dos gates de Axe, erros de runtime e overflow executados pela raiz. Nenhum browser, servidor, build ou runner adicional foi iniciado por este agente; nenhuma regra comercial, aparência publicada ou fonte de produto foi alterada nesta revisão.

O inventário seco solicitado pela raiz está congelado em `output/ondas-demo/ondas-route-artifact-inventory.{py,json,csv,md,log}`. Ele normaliza rotas dinâmicas e distingue o redirect incondicional `/painel/visao`→`/painel`, sem editar a matriz global ou elevar aprovação. O snapshot histórico de06:25:33UTC tem95 rotas nominalmente representadas (94 com pixels próprios e uma pelo contrato de redirect),75 com D/M,1.445 metadados e1.420 estados únicos; os20 gaps de viewport são explícitos. Esses números misturam apenas os quatro batches declarados no arquivo, incluindo rodadas antigas/parciais, portanto **não descrevem cobertura visual atual concluída**. A integração dos batches finais cabe à raiz.

## Complemento CDP final: remainder033–048

As16 pranchas finais atribuídas a este agente foram efetivamente abertas, com todos os62 recortes e34 imagens completas mobile390×844. Os31 hashes únicos conferem. Ledger próprio: `output/ondas-v24/admin-verified-cdp-remainder-public-review.json`. Não há fronteira parcial nesta fatia; as32 pranchas anteriores permanecem sob revisão dos demais agentes.

Os gráficos de pagadores, campanhas, funil, páginas mais vistas e séries diárias estão renderizados em turquesa. As tabelas foram vistas nas posições inicial, intermediária e final da rolagem horizontal: as colunas fora do recorte inicial aparecem nas capturas seguintes dentro da superfície. Paginação, métricas de retenção, erro de suporte e erro de tráfego cabem e permanecem legíveis. Dialogs de suspensão, retirada de envio e retirada de link publicado mostram mensagens e ambas as ações completas. Nenhuma ação administrativa foi executada pelo revisor.

Não foi confirmado novo defeito material nestes34 PNGs. Os respectivos sidecars registram runtimeErrors e Axe vazios, evidência separada da inspeção. Os disclosures de consentimento aparecem fechados nesta fatia, portanto ela não valida seu conteúdo expandido. Esta revisão não encerra os quatro PNGs loading com main vazio do lote early nem certifica combinações fora dos estados enumerados. Produto permaneceu congelado; nenhum servidor, browser, build ou E2E adicional foi iniciado.

## Diagnóstico do lote público de produto e reparos focais

A raiz comunicou três contratos falhos no lote `public-product-final`. As falhas foram classificadas pela evidência, sem remover gates de erro/Axe ou inventar aprovação dos PNGs:

| Contrato | Causa demonstrada | Reparo / verificação |
| --- | --- | --- |
| Compartilhar detalhe D/M | A asserção esperava origem HTTP e porta efêmera do runner; o produto copia a canonical HTTPS fornecida no SSR. `app/link/[id]/page.tsx` entrega `link.seo.canonical` ao botão. | Somente QA: ler a única canonical do documento, conferir origem HTTPS do tenant, caminho exato do ID e ausência de query/hash; comparar o clipboard à URL validada. Contrato de produção preservado. |
| Cancelar resumos D/M | A fixture usava UUID de36 caracteres; o endpoint exige64 caracteres hexadecimais. A resposta real final era validação, sem chegar ao caso de sucesso. | Somente fixture: `randomBytes(32).toString('hex')`, preservando hash com namespace, tenant, lote e cancelamento real após a falha503 simulada. Não era falha de unroute. |
| Sugestões da home mobile | O trace mostra fill iniciado logo após load, valor vazio depois da ação e nenhum request de sugestões. `SearchBox` resetava estado no efeito passivo inicial, depois do evento antecipado; aguardar Menu ou Lens mascararia a corrida. | Correção real mínima autorizada: estado já inicializado não é redefinido no primeiro efeito; contexto anterior de `initial`/`discoveryQuery` só permite reset em mudança efetiva das props. A primeira digitação antes dos efeitos passivos falhou antes e passou após o reparo. |

O teste de regressão da digitação usa `useLayoutEffect` de um wrapper para inserir o primeiro evento antes dos efeitos passivos de montagem; a implementação de React não foi mockada. A rodada focal final passou **13/13** (`search-initial-passive-green.log`), incluindo preservação de valor no mesmo contexto, novo termo inicial, mudança de filtro, cancelamento de requisição, IME, teclado e respostas antigas. O log RED (`search-initial-passive-red.log`) registra o valor recebido vazio. ESLint dos dois arquivos de SearchBox e da spec pública passou em `public-final-fixes-lint.log`.

No snapshot examinado do lote público,212 JSONs acompanhavam cinco error-contexts: canonical D/M, cancelamento D/M e sugestões mobile, correspondentes às causas acima. Nenhum sidecar daquele snapshot registrava runtimeErrors, Axe ou overflow da página; isso **não é revisão visual dos212 PNGs nem resultado do recheck**. A raiz executará o rebuild e os seis casos D/M afetados. Fonte congelada após esses reparos; nenhuma regra de busca, privacidade, canonical ou cancelamento foi alterada, e este agente não iniciou E2E/build/browser/servidor.

A revisão de pixels do agente resource detectou ainda um iframe branco no estado desktop `profile-video-loaded-local-player`. O harness aguardava apenas a caixa do iframe; agora também exige o texto da fixture local visível dentro do documento via `frameLocator`, antes de capturar. Mantém consentimento e interceptação local, sem carregar provedor externo e sem espera arbitrária. ESLint da spec passou em `public-frame-ready-qa-lint.log`; a imagem de sucesso depende do recheck e de nova abertura pelo revisor.

Na referência Ondas detalhe mobile do lote `reference-mobile-rails-final`, o contexto/trace registra `SyntaxError: Invalid or unexpected token`, com stack/location vazios; não há resposta HTTP≥400 registrada nesse trace. Portanto não foi classificado como502 ou falha de decode. O gate de pageerror permanece, sem retry global. A raiz fará recheck isolado para distinguir ocorrência transitória de defeito reproduzível; este estado ainda não está aprovado.

## Correção focal do alerta de favoritos

O agente resource abriu o PNG original de `favorite-error` (registro153 do lote público) e confirmou metadados do card atravessando a mensagem de conexão. A fonte tinha somente `<p role="alert">` com `surface-raised` translúcido, sem Lens nem blur próprios. A raiz autorizou o reparo local, sem mudança do contrato de favoritos.

`FavoriteButton` mantém a mensagem, papel de alerta e ações existentes, adicionando `LiquidLens radius={12}`. O host do erro tem isolamento próprio, tint95% no navy do popup, frost12px, backdrop12px, borda/sombra e quebra de texto. O blur do host é removido em reduced-transparency/forced-colors; a Lens compartilhada fornece o fundo sólido de fallback. Não foram alterados transporte, PUT/DELETE,401, estado confirmado, bloqueio de duplicata, pending ou readOnly.

O teste novo falhou antes por ausência da superfície óptica e passou após: **2/2** (`favorite-error-glass-red.log` / `favorite-error-glass-green.log`), preservando a mensagem, estado confirmado e nova tentativa. ESLint passou em `favorite-error-glass-lint.log`; diff-check sem erro. Fonte congelada. **A legibilidade sobre metadados em desktop/mobile precisa ser confirmada nos novos PNGs, abertos de fato**; teste de composição e CSS não substituem essa inspeção. Nenhum runner ou navegador adicional foi iniciado.

## Variantes administrativas finais: boards045–087

As43 pranchas atribuídas a este agente foram efetivamente abertas em resolução original, com todos os170 recortes examinados:80 registros tocados,79 completos e80 hashes únicos conferidos, sem divergência. Ledger: `output/ondas-v24/admin-variants-final-public-review.json`. `settings-impressions-saving` mobile tem somente o recorte final nesta fatia; o início pertence ao board044 de outro revisor e permanece parcial aqui. As44 pranchas anteriores não entram nesta contagem.

Nos pixels desta fatia, configuração e resumo privado de redes, capacidade/premium, dialogs de faturamento, mensagens de nova tentativa e estados pendentes permanecem legíveis. A busca de oportunidades apresenta gráficos turquesa e calendários completos; a validação de intervalo cabe na superfície. O resumo de validação do envio usa vidro, superando o bloco vinho opaco dos artefatos antigos. Meus links foi visto com métricas indisponíveis,14 itens, última página e ações expandidas em desktop/mobile.

O editor de anexos foi examinado em desktop/mobile nos estados de descrição obrigatória, conflito preservando proposta, rascunho removido mantendo aprovado, arquivo inválido, preparação, falha de atualização/remoção, remoção concluída e envio pendente. Uploads, campos, textos de ajuda e ações cabem em390px. As imagens azuis são SVGs sintéticos declarados da fixture, não capas reais com falha. O cenário sequencial de erro de atualização conserva a mensagem anterior de remoção; não foi aprovado como erro isolado nem interpretado como nova perda de dados.

Dois apontamentos foram enviados à raiz. `ADMIN-VAR-O01` é observação: o cabeçalho do calendário dentro do dialog Destaques ocupa três linhas, enquanto o calendário de oportunidades ocupa uma; todos os dias e ações cabem, sem defeito funcional confirmado. `ADMIN-VAR-O02` impede aprovar uma captura: `subscription-variant-resume-payment` mobile (board070, registro134, SHA256 `1b59866e1d0a24a83e6655c16305dd7b63fcba6608cfa0e4404f596aa29d6e2b`) mostra somente header/atmosfera/footer. Seu JSON registra headings,17 Lenses e loading2, enquanto o desktop equivalente apresenta os planos. A causa de prontidão/captura permanece pendente; não foi alterado CSS por hipótese. Este arquivo e o registro parcial estão explicitamente excluídos de sucesso no ledger.

Os80 sidecars registram runtimeErrors e Axe vazios, evidência independente que não transforma o PNG sem main em estado aprovado nem substitui interação. Nenhuma transação, envio externo ou mudança de dados foi executada. Produto permaneceu congelado e não foi iniciado browser, runner, build ou servidor adicional.

O recheck canônico confirmou uma particularidade do streaming de metadados do Next15: a canonical pode estar no body do DOM hidratado, embora exista corretamente no HTML SSR. O QA agora usa `link[rel="canonical"]` no documento inteiro, mantém cardinalidade1, origem HTTPS do tenant, caminho exato e ausência de query/hash, e compara o clipboard à URL validada. ESLint focal passou em `public-canonical-streaming-qa-lint.log`. Nenhuma fonte SEO ou regra de URL foi alterada; o resultado E2E final continua sob execução serial da raiz.

## Referências mobile finais:66 pranchas e carrosséis

Foram efetivamente abertas **todas as66 pranchas** de `reference-mobile-rails-final-boards-final`, com262 recortes,46 registros completos e45 hashes únicos conferidos sem divergência. Ledger: `output/ondas-v24/reference-mobile-rails-final-public-review.json`. As36 rotas representam as32 direções, galeria, legacy home e os dois detalhes. Esta inspeção foi de referências dev390×844; não certifica produção nem altera as direções experimentais autorizadas.

Seda, Galeria, legacy, Ondas e as demais referências examinadas têm fotografias visíveis; não foi confirmado novo bloco azul indevido ou fallback de imagem nesta rodada. Duotone conserva seu tratamento cromático e Discos suas máscaras circulares/furo central, distinguindo efeitos intencionais de falha de carregamento. A galeria inteira foi examinada nos boards051–056, incluindo as32 miniaturas, títulos, descrições e links; essas miniaturas não foram contadas como nova evidência funcional das direções.

Ondas home026–028 mostra hero central, busca, redes/assuntos, destaques com imagem acima do texto, café, coleções, CTA e rodapé em vidro. Ondas detalhe045–046 tem capa grande, resumo, Sobre o canal, Detalhes, ações e relacionados legíveis. A leitura estática não promove ícones coloridos, pausa ou números fictícios dessas rotas dev a regra da produção; prevalecem as correções explícitas do usuário.

O carrossel legacy foi visto nas quatro posições capturadas nos boards036–037. Cartões-postais (041) e Cinema (043) foram vistos nas três posições adicionais: início, meio e final mostram os três patrocinados completos nas posições correspondentes. Os cortes parciais das cartas vizinhas são a janela da rolagem horizontal, sem inferir corte permanente do conteúdo.

Há uma observação dev `REF-M-O01`: em Bauhaus/Jardim, a máscara arredondada da foto intercepta parte do ícone à esquerda de certos selos patrocinados, mantendo o texto identificável. Foi enviada à raiz sem redesenho ou alteração por gosto; não corresponde a um defeito confirmado na home Ondas de produção.

**O detalhe Ondas permanece excluído do sucesso** (`REF-M-RUNTIME-01`, registro35). A raiz informou35/36 testes passados e um `SyntaxError: Invalid or unexpected token`, sem causa demonstrada, com recheck após reinício ainda pendente no momento desta leitura. Os46 sidecars registram Axe e runtimeErrors vazios no instante da captura; isso não apaga a falha da asserção final nem permite aprovar o caso porque seus pixels estão legíveis. O resultado posterior será anexado somente quando informado e sua nova imagem aberta, se houver recaptura.

Nenhum browser, servidor, build, E2E ou envio externo foi iniciado por este agente. As imagens estáticas não certificam movimento no tempo, toque em aparelho físico ou todas as combinações de interação; os gates independentes continuam sob responsabilidade da raiz. Produto e QA permaneceram congelados durante a leitura.

## Recheck público de produto: seis casos passados, detalhe excluído

O resultado `public-product-recheck-final.json` tem **6 passados e2 falhos**: filtro inválido, home e convite/cancelamento D/M passaram; os detalhes D/M falharam antes de gerar sidecars próprios na assertiva de canonical. Esses detalhes não foram aprovados. As pranchas foram geradas com o renderer local existente e índice atual de hashes já abertos: **18 boards/71 recortes/36 PNGs**, todos efetivamente abertos. Ledger: `output/ondas-v24/public-product-recheck-final-public-review.json`, com hashes conferidos e limite explícito dos dois casos falhos.

O reparo de favoritos foi confirmado visualmente em desktop (board004) e mobile (011): a mensagem inteira fica em vidro próprio forte, sem metadados atravessando o texto. O estado salvo seguinte conserva a indicação de favorito. O erro antigo do registro153 fica superado para esse defeito, sem somar o artefato antigo à cobertura atual. Busca por teclado D006/M014 conserva o termo digitado, popup legível e opção ativa com contorno turquesa. O caso mobile que antes perdia o primeiro termo passou na rodada executada pela raiz.

Também foram vistos os cards com foto e sem foto, destaque identificado, coleções, CTA, rodapé e navegação; consentimento inicial/preferências/reabertura D/M com ações e checkbox legíveis; drawer mobile com cinco destinos e fechamento focado. Filtro inválido tem heading, explicação e recuperação em vidro. Convites sem token/inválido e cancelamento com confirmação, pending, falha, token inválido e sucesso cabem sem corte de ações. `Resumos desativados` foi alcançado em ambos os tamanhos, confirmando que a fixture hex64 permite testar o sucesso; o erro inválido continua em português contextual.

Nenhum novo defeito material foi confirmado nos36 PNGs deste lote. Seus sidecars têm runtimeErrors e Axe vazios no instante da captura; o resultado funcional continua granular, sem converter6/8 em aprovação total. Player e publicação com foto ainda não têm sidecars nesta pasta e permanecem fora desta leitura. Este agente somente renderizou os artefatos locais e abriu imagens; não acessou o runtime nem executou E2E/build/servidor ou envios externos.

## Perfil final: revisão atribuída151–190

As40 pranchas151–190 de `profile-complete-final-boards-early` foram efetivamente abertas em resolução original:159 recortes,133 registros completos e121 hashes únicos, todos conferidos sem divergência. Ledger: `output/ondas-v24/profile-complete-final-public-review.json`. As primeiras150 pranchas pertencem aos outros revisores e não entram nesta contagem. O ledger exclui14 estados de sucesso por falhas independentes dos respectivos fluxos, violações Axe ou correção de fonte ainda sem recaptura. Não foi transformado teste falho em caso aprovado por seus pixels.

Foram examinados acessos e dialogs de aprovação/recusa/solicitação, favoritos e coleções, integrações e entregas, restauro, links permanentes, interesses, lembretes, painel e editores de busca/dados/grupos. Base, carregamento, erro, vazio, seletores e dialogs presentes nesta fatia mantêm texto e ações legíveis. Formulários, toolbar mobile e seletores de sete destinos cabem em390px. A prévia de autor Areia continua distinta do material de plataforma; o segredo exibido na fixture de integração é texto sintético explicitamente identificado. O checkbox azul do dialog de grupo é achado já conhecido em correção compartilhada, sem nova alteração concorrente.

`PROFILE-FINAL-P01` é um defeito real identificado no board151: o erro sem página do MediaKit usava a variante de apresentação do autor, deixando o estado de plataforma sem atmosfera e sem afastamento lateral. O grafo e os callers confirmaram `MediaKitPreview` como composição local. Após autorização da raiz, foi aplicado `variant={error ? 'platform' : 'profile'}` ao shell existente, preservando o material de autor no conteúdo carregado e no `pendingOnly`. O teste novo reproduziu a ausência de atmosfera antes do reparo (**RED1/GREEN3**); retry, conteúdo e pendingOnly passaram, e ESLint retornou0. Logs `media-kit-preview-platform-{red,green,lint}.log`. A captura antiga sem página permanece excluída até recaptura; os testes de fonte não substituem a nova inspeção visual.

Os133 sidecars registram runtimeErrors vazios; três registram violações Axe: nome acessível de coleção D/M e `aria-controls` de integração desktop. Esses achados foram encaminhados à raiz e não silenciados. Há falhas independentes de retorno de foco/locator no resultado completo do lote, sob correção e recheck pela equipe. Nenhum browser, servidor, build, E2E, transação ou envio externo foi executado por este revisor.

## Recheck detalhe/publicação rica: diagnóstico de falhas reais

`public-profile-detail-rich-recheck-final.json` chegou com2 passados e4 falhos. A assertiva de canonical já passa e preserva o contrato HTTPS sem porta de preview; nenhuma alteração de SEO foi feita. A leitura dos traces descartou a hipótese de simples locator para os quatro failures: a requisição responsiva de capa foi efetivamente interceptada com404 nos dois tamanhos, e o console dos dois casos de vídeo registra bloqueio por CSP antes de haver requisição interceptável do player.

Na capa, `CatalogImage` só respondia ao evento `error`: quando a resposta falha antecedia a montagem/hidratação, a imagem quebrada continuava no DOM. Com autorização da raiz, o commit do elemento agora também reconhece `currentSrc` não vazio, `complete` e `naturalWidth=0`. A condição de `currentSrc` preserva lazy ainda não iniciado, reproduzindo a proteção já aplicada em `PreviewPhoto`. O fallback opcional, `onError`, URL aprovada, larguras responsivas e recuperação ao mudar de fonte permanecem. Testes novos cobrem falha anterior ao mount, lazy sem fonte selecionada e carregamento/conclusão válidos.

No vídeo, frontend e backend já validam exclusivamente YouTube e Vimeo, convertendo-os para `https://www.youtube-nocookie.com/embed/...` e `https://player.vimeo.com/video/...`. O componente somente cria iframe após consentimento. A política em `middleware.ts` permitia apenas Stripe/GTM e bloqueava os dois players já suportados. Foram acrescentadas apenas essas duas origens exatas a `frame-src`, sem wildcard, `https:`, alteração de `script-src`/`connect-src` ou relaxamento de outras diretivas. O teste compara os destinos com os outputs reais do validador e preserva a restrição das demais fontes.

Os dois defeitos produziram **RED2/17pass**, depois **23/23 verdes** incluindo os testes existentes de consentimento/editor. ESLint dos arquivos alterados e da spec passou. Logs `output/ondas-v24/public-image-video-{red,green,lint}.log`. A spec mantém a assertiva de fallback e agora também exige a resposta404 real atingida. Para o player, exige uma requisição à fixture HTML,200, origem/caminho exatos e o texto esperado dentro do frame antes da captura. A fixture impede conexão real com o provedor; não foi enviado vídeo nem tráfego externo por este agente.

Fonte congelada e informada à raiz antes do próximo rebuild. **Os quatro casos antigos continuam falhos; sucesso funcional e visual dependem do recheck D/M executado pela raiz e da abertura dos novos PNGs.** Não houve runner, build, servidor ou browser adicional por este agente.

## Referência Ondas mobile: recheck concluído

`reference-ondas-detail-recheck-final.json` registra **1/1 passado**. O PNG original completo foi efetivamente aberto por este agente: capa de show carregada, resumo, sobre, detalhes, três relacionados com suas fotos, ações e rodapé foram examinados em390px, sem novo defeito material. SHA256 conferido `26015cc5fc9f5bbeb789ed443634030fd4c3e2039257aa3909250add21f51d2b`; ledger `output/ondas-v24/reference-ondas-detail-recheck-final-public-review.json`.

O renderer autorizado gerou zero pranchas novas porque esse hash já constava no índice de imagens abertas; ainda assim o original desta rodada foi aberto diretamente. O resultado1/1 supera a falha antiga `REF-M-RUNTIME-01` do mesmo caso, mantendo o histórico e sem atribuir causa retroativa ao SyntaxError. É uma referência dev: pausa, números fictícios, marcas coloridas e simulações pertencem à demonstração e não passam a contrato de produção. Não houve browser do aplicativo, build, E2E ou servidor iniciado por este agente.

## Material de imagem/vídeo: recheck6/6 e limite visual explícito

`public-image-video-material-final.json` registra **6/6 passados**, em62,9s, para home, detalhe e publicação rica D/M, após os reparos de imagem e CSP. Todas as19 pranchas novas foram abertas de fato:73 recortes,26 registros completos e26 hashes conferidos, sem divergência. Ledger `output/ondas-v24/public-image-video-material-final-public-review.json`. Os arquivos pulados pelo índice de SHA já aberto não foram contados como novas imagens revistas. Os26 sidecars têm runtimeErrors/Axe vazios.

O fallback404 foi confirmado nos pixels D/M: a capa recolhe sem reservar um bloco vazio, mantendo resumo, Sobre, Detalhes e ações. O detalhe com foto e a mensagem Copiado estão legíveis. A home conserva fotos completas, cards sem imagem, patrocinados identificados, coleções, CTA, busca por teclado e consentimento/drawer. O erro de favorito continua em vidro forte sem metadados atravessando o texto.

**Dois PNGs fullPage do player ficam excluídos como evidência de player visível.** Os gates funcionais comprovam request interceptada1x, HTTP200, src exata e texto do documento local visível antes da captura; os pixels dos boards017–019, contudo, mostram somente a área vazia do iframe. Não se atribuiu causa a OOPIF sem prova, nem se alterou produto por essa hipótese. A composição Pêssego, avatar/imagem real e eventos foram examinados, mas esses dois PNGs não aprovam a aparência do player.

A raiz autorizou uma captura QA adicional `video-local-player-viewport`, com iframe centralizado e integralmente na viewport, mantendo a composição fullPage e as assertivas de texto antes/depois. Somente a spec foi alterada nessa etapa; ESLint passou em `public-video-viewport-qa-lint.log`. O recheck rico D/M e a abertura dos novos PNGs permanecem pendentes. O HTML do player é uma fixture local interceptada; não houve conexão com provedor externo por este revisor.

Também foram abertos os dois originais `profile-search-error` D/M dos casos passados em `public-profile-detail-rich-recheck-final`: alerta contextual, retry, termo Projeto e foco permanecem legíveis, com tema Areia do autor preservado. Seus dois hashes conferidos e escopo restrito estão em `public-profile-search-error-final-public-review.json`. Eles não convertem os quatro casos falhos antigos da mesma rodada em sucesso; os6/6 novos são resultado independente, sem somar repetições.

## Perfil material final: boards026–050

As25 pranchas atribuídas a este agente foram efetivamente abertas em resolução original:100 recortes,78 registros completos,78 hashes conferidos e nenhuma divergência. Ledger `output/ondas-v24/profile-material-final-public-review.json`. O build informado pela raiz e confirmado no `BUILD_ID` local é `TpBFr2nURL7ouGlPA7fVi`; o resultado independente da rodada é **28/28 passados**. Os78 sidecars têm runtimeErrors e Axe vazios. As pranchas001–025 da raiz não entram nesta contagem.

MediaKit erro/sem página D/M (045–046) agora apresenta atmosfera e margens corretas, superando visualmente `PROFILE-FINAL-P01`. Checkbox de grupo/link e dos modelos usa turquesa da marca, superando o controle azul nativo nas mesmas composições. Modelos preservam a distinção manter/substituir, confirmação e bloqueio sem aceite. QR, salvando/salvo, conflito e erro mantêm campos e ações legíveis; o rascunho digitado foi preservado. Permissões, rádios e personalizado foram vistos com scroll completo dos dialogs D/M; prévia autorizada conserva Areia do autor, e acesso encerrado não revela seu conteúdo.

Foi encontrado `PROFILE-MATERIAL-P01` no board027: o menu completo mobile permite ler heading/aviso/Publicar através dos itens. A fonte local usava apenas Lens com tint85% e frost baixo, host transparente sem blur próprio. A raiz autorizou o reparo local: `profile-editor-toolbar.module.css` agora usa tint95% navy, frost12 e backdrop12, sombra e fundo de fallback sólido; reduced-transparency remove blur e forced-colors usa Canvas/CanvasText. Não foram alterados posicionamento, altura/scroll, ações, concessões, foco, WorkspaceControls ou qualquer primitiva. **3/3 testes existentes de geometria/ações/Escape/foco passaram**, ESLint0, PostCSS parse0 e diff-check sem erro. Logs `profile-toolbar-popup-glass-{tests,lint}.log`. Não foi criado teste de DOM fingindo medir contraste; o PNG problemático é a evidência do defeito, e a recaptura D/M continua necessária para confirmar a solução.

Cinco estados ficam excluídos no ledger: menu completo ainda anterior ao reparo; Team erro mobile que conserva vazio junto do erro, já corrigido por outro agente após o build; e três estados de métricas com hint WorkspaceFilter anterior à correção compartilhada. Não se confundiu28/28 funcional com aprovação desses pixels. A fonte está congelada; as recapturas ficam na fila da raiz. Nenhum browser, servidor, build, E2E, envio externo ou mudança de dados foi executado por este revisor.

## Fechamento das provas de menu e player

`menus-complete.json` registra **4/4 passados**. O renderer com índice atual produziu13 pranchas novas,51 recortes e35 PNGs; todas as pranchas foram efetivamente abertas e todos os hashes conferidos sem divergência. Ledger `output/ondas-v24/menus-complete-public-review.json`. O menu desktop003 e mobile006–007 agora mantém o fundo forte: heading, aviso e Publicar não atravessam os itens. O complemento de scroll mobile mostra o final com Abrir minha página e Retirar do ar. Isso confirma o reparo `PROFILE-MATERIAL-P01` nos dois tamanhos e supera os pixels antigos do board027.

As novas pranchas também mostram QR, erro, conflito, salvando/salvo e confirmações sem perda de texto, além das três etapas da integração, edição, chave sintética, renovação/remoção, ações expandidas e entregas em todas as situações. Campos, checkbox, foco e ações permanecem legíveis em390px. Nenhuma decisão ou envio foi executado por este revisor; os dados de chave e entrega são fixtures declaradas.

`video-viewport-complete.json` registra **2/2 passados**. As4 pranchas novas foram integralmente abertas:15 recortes,6 PNGs e6 hashes conferidos, sem divergência. Ledger `output/ondas-v24/video-viewport-complete-public-review.json`. **O player aparece de fato nas novas capturas viewport D/M** (boards002 e004), com fundo navy e texto do documento local legíveis. Os gates preservados comprovam request interceptada1x,200, URL exata, iframe inteiro na viewport e texto visível antes/depois. A captura de consentimento com foco, imagem/avatar reais, banner e eventos preserva o tema Pêssego do autor.

Os dois PNGs fullPage continuam sem representar os pixels do iframe e ficam explicitamente classificados como composição externa, excluídos de prova positiva de player. A evidência adicional viewport resolve a lacuna `PUBLIC-IMAGE-VIDEO-C01`, sem reclassificar retroativamente os arquivos vazios ou atribuir causa ao navegador sem diagnóstico. Não houve conexão com provedor externo: o documento do player é HTML local interceptado.

Nos dois ledgers, runtimeErrors e Axe estão vazios. As contagens4/4 e2/2 pertencem a jornadas diferentes e não somam repetições das rodadas anteriores. Nenhum produto foi alterado nesta etapa; não houve browser do aplicativo, servidor, build, E2E ou envio externo por este agente. A revisão foi encerrada somente depois de abrir todas as novas pranchas e salvar os ledgers.
