# Ícones e navegação

## Grupos e busca — 18/10/2026

Adicionar grupo usa plus e rótulo visual Grupo na barra, com nome acessível Adicionar grupo. Canais de acesso e Botão principal mantêm channels/primaryLink no dropdown. Prévia mantém preview e Atualizar dados mantém refresh. A busca usa search no campo e filter para abrir o modal; resetFilters limpa o conjunto de filtros. `clearSearch`, um X circulado, limpa somente o texto e difere de close, reservado a fechar superfícies. Compactar o rótulo visual da aba para Links não muda seu nome acessível Grupos e links. [Implementação e evidências](evidencias/grupos-busca-2026-10-18/README.md).

## Minha página — visão geral de 18/10/2026

Os atalhos reutilizam o inventário `profileEditorActions`: importar, modelos, histórico, métricas e checklist mantêm nomes e desenhos na barra, no dropdown e nos cards. `preview` e `refresh` permanecem visíveis. Abrir página usa `external`; retirar do ar usa `disable`; copiar e QR Code preservam os símbolos existentes. `appearance` (paleta) identifica personalização visual, inclusive a etapa de apresentação do checklist, sem reutilizar `settings`, reservado à configuração. O resumo de conteúdo usa `link`, e a identificação da página usa `profile`. Os três pontos continuam significando opções adicionais. A navegação entre seções preserva os rótulos das abas existentes e adiciona Visão geral como padrão.

## Minha página — simplificação de 17/10/2026

O editor usa `preview` (janela com olho) para Ver prévia e o `RefreshButton` compartilhado (`refresh`) para Atualizar dados, fora do menu de três pontos. Ambos preservam seus significados existentes; o botão de atualização mantém nome acessível e tooltip mesmo sem texto visível. O seletor do botão principal fica em modal e usa rótulo textual, sem atribuir a ele um símbolo já reservado a outro contexto. Evidências em [Minha página: rascunho automático](evidencias/minha-pagina-autosave-2026-10-17/README.md).

## Calendário — 17/10/2026

`ActionIcon name="calendar"` representa exclusivamente abrir o seletor de data. O desenho foi comparado ao catálogo de `action-icon.tsx`: não reutiliza relógio (horário), sino (lembretes) ou destinos de navegação. Repetição nos filtros e no editor de destaque mantém o mesmo significado. Ícone decorativo com `aria-hidden`; botão recebe nome “Abrir calendário” e descrição com a data atual. Testes de navegação/ícones incluídos na suíte completa.

## Exclusividade por contexto — 17/10/2026

Regra solicitada pelo usuário: contextos diferentes nunca usam o mesmo símbolo. A repetição é permitida para o mesmo significado, como o mesmo destino no cabeçalho e na sidebar, editar registros ou salvar formulários. Mudanças de cor, tamanho, nome ou espessura não distinguem conceitos.

Correção solicitada posteriormente pelo usuário: favoritos conserva a estrela nos cards, abas, skeleton e sidebar, preenchida em amarelo quando salvo. A ação de destaque e o badge patrocinado genérico usam megafone, preservando a exclusividade do contexto. A skill e o teste dos pares semânticos refletem essa escolha. A jornada de salvar/coleções passou em desktop/mobile (mais setup); capturas em `output/icon-semantics/favorite-stars/`.

Procedimento mantido em [.agents/skills/temlink-icons/SKILL.md](../../.agents/skills/temlink-icons/SKILL.md), também referenciado pelo AGENTS da raiz.

Os desenhos compartilhados ficam em `frontend/src/components/ui/action-icon.tsx`; os destinos em `frontend/src/components/layout/navigation-icons.ts`. Cabeçalho e menus de painel/admin usam o mesmo mapa. Os subitens conservam sua apresentação textual existente; seus símbolos também têm mapeamento exclusivo, sem depender de CSS para esconder colisões.

| Contextos antes confundidos | Decisão |
| --- | --- |
| Catálogo, painel e gestão | Janela de catálogo, grade de painel e edifício administrativo. |
| Publicação, Links, Criar link, Minha página e Convites | Publicar, corrente, corrente com adição, página e envelope. |
| Pedidos, favoritos, destaque, planos e estornos | Recibo, estrela (favoritos), megafone (destaque), documento de plano e devolução. |
| Lembretes, disponibilidade e retenção | Sino, sinal de disponibilidade e ciclo de retorno. |
| Revisões, moderação, denúncias, correções e integrações | Prancheta, escudo, bandeira, ferramenta e plugue. |
| Conta, configurações, suspensão e acesso de operadores | Pessoa, ajustes, proibição e chave. |
| Copiar, abrir externamente, Pix e cartão | Folhas sobrepostas, saída, losango e cartão. |
| Métricas, tráfego, mais clicados, pagadores e contas | Gráfico, tendência, cursor, pessoa com moeda e pessoas. |
| Cancelar, limpar filtros, rejeitar e desativar | X, filtro com X, documento rejeitado e botão de energia. |
| Expandir, reordenar e carregar mais | Chevron, seta com limite e lista com seta. |
| Impressões, prévia, resultado e contestação | Olho, janela com olho, gráfico e balão de dúvida. |

As abas internas de tráfego e financeiro mantêm seus rótulos e perdem o gráfico decorativo idêntico em todas as opções. Os SVGs locais de redes e nichos foram comparados pelos caminhos e não apresentaram duplicatas exatas. Os novos pictogramas são desenhos locais, sem bibliotecas adicionais.

`navigation-icons.test.tsx` verifica exclusividade dos desenhos entre destinos, grupos renderizados e pares semânticos corrigidos. O E2E W05 verifica painel/admin em desktop/mobile; W01 e W02 cobrem navegação, filtros, teclado, foco, zoom e axe nas jornadas existentes. Essa cobertura não garante automaticamente a semântica de novos ícones fora do mapa: a skill exige revisão dos consumidores e inspeção visual.

Validação: lint, typecheck e 217 testes (68 arquivos) aprovados; 6 E2E finais aprovados (W01, W02 e W05 em 1440×900 e 390×844, incluindo a verificação existente em 320 px/200%). Axe não apontou violações nos estados cobertos. Build de produção executado pelo setup E2E com `TEMLINK_E2E_BUILD=1`, preservando o `.next` do servidor de desenvolvimento. Galeria e capturas finais inspecionadas em `output/icon-semantics/icon-gallery.png` e `output/icon-semantics/final/`. Containers e serviços desta execução foram removidos pelo teardown; os servidores locais existentes permaneceram ativos. Não foi feita validação em aparelho físico ou produção.

O validador Python da skill não executou por ausência de PyYAML nos runtimes disponíveis. Frontmatter, nome, descrição, propriedades permitidas e ausência de placeholders foram validados com o `js-yaml` já instalado no frontend; não foram adicionadas dependências.

Arquivos da fatia: skill e referência no AGENTS; mapa/testes de navegação; `action-icon.tsx`, `site-navigation.tsx`, `workspace-navigation.tsx`; consumidores de conta, favoritos, perfil, convites, links, novo envio, destaque, moderação, denúncias, estornos, gestão e integração Evolution; W05 em `workspace-layout.spec.ts`.

Reversão: retirar somente esta skill/referência e os mapas/testes novos, restaurar o mapa anterior dos dois menus e reverter os nomes de ícones nos consumidores alterados nesta fatia. Há alterações locais anteriores nesses mesmos arquivos; não usar restauração integral ou reset do Git. Nenhum commit ou deploy foi feito.

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

## Formulário de criação de link — 17/10/2026

Rede e assunto reutilizam `FacetIcon`, os mesmos logos e pictogramas das facetas do catálogo. O Select recebe ícones por valor, mantendo texto acessível, busca por digitação e contrato de envio. Os ícones aparecem tanto nas opções quanto no valor selecionado e são decorativos; nenhuma nova associação de significado foi criada.

## F19 — histórico e restauração, 17/10/2026

ActionIcon history usa lista com relógio para publicações anteriores; restore usa seta de desfazer para copiar uma versão ao rascunho. Não reutilizam ícones de retenção comercial ou estorno. Ver diferenças reutiliza preview por ser inspeção; Voltar à edição usa back. Estado acessível continua no texto, com SVG decorativo.

F08 (17/10/2026): contexto “Buscas” da gestão usa `opportunities` (lâmpada de oportunidade), distinto da lupa usada na ação de buscar e da navegação pública. Filtros, refresh e paginação mantêm os significados existentes. W05 desktop/mobile confirmou desenhos distintos entre contextos; W06 confirma o menu indisponível apenas até hidratar, preservando o desenho.

F11 (17/10/2026): `subscription` identifica a assinatura da própria página; `billingAdmin` identifica a administração de contratos, com documento/setas distintos. Não reutilizam recibo de Pedidos, cartão de Pagamento, lista de Destaques ou configuração. Menus do painel/admin e respectivos skeletons preservam os mesmos significados. Testes de colisão e W05 desktop/mobile aprovados.

F13 validada localmente: `qr` usa três marcadores de QR para a exportação nas duas superfícies; `download` usa seta para bandeja e identifica baixar arquivo. Não reutilizam a grade da Visão geral ou a seta/lista de Mostrar mais. Copiar endereço mantém o ícone copy. Todos os desenhos são decorativos, com rótulos textuais; a regressão de navegação desktop/mobile passou na bateria de 79 E2E.

F14: schedule usa calendário com relógio para programar exibição; calendar continua identificando o seletor de datas. Não reutiliza histórico, QR ou disponibilidade. Rótulo Agendar acompanha o desenho; regressão dos menus/ícones incluída na execução conjunta.

F16: templates usa camadas empilhadas para Modelos; não reutiliza o desenho de Página/Aparência/Histórico. Ver modelo usa preview, pois tem o mesmo significado de visualizar. Minha página mantém aria-current=location nas subrotas, e page apenas no destino exato; testes de navegação/ícones incluídos.

F17: importLinks usa seta entrando em documento/lista, distinto de download, copiar, criar link e publicar. Editar/salvar/voltar conservam os desenhos do mesmo significado; duplicado tem texto sem reciclar o ícone Copiar como outro conceito. A entrada fica no editor, sem novo item de sidebar.

F18: busca, pasta/grupo, limpar, voltar e próximo mantêm os ícones existentes para esses mesmos significados. Controles na página pessoal e prévia; nenhum novo item de sidebar. Botões continuam com nomes acessíveis e rótulos, paginação move o foco ao resultado.

F27: city usa pin, language usa tradução A/ideograma, modality usa tela/cadeira; desenhos distintos de Rede, Assunto e navegação de página. Aplicar/Limpar/Salvar/Voltar mantêm seus significados existentes. Labels textuais acompanham SVG decorativo; sem novo item de sidebar.

F31: interaction usa página com ponteiro para Métricas da minha página; pauseMeasurement usa duas barras para Pausar medição. Distintos de chart/resultado de destaque, pointer/saída e reviews/moderação. Voltar/atualizar/pesquisar/criar página mantêm os significados existentes, SVG decorativo e label textual. Nenhum novo destino raiz na sidebar.

F34: checklist usa lista com três marcas, distinta da prancheta de moderação; publicação usa publish, abrir página usa profile, acompanhar análise usa reviews, recusa usa edit. Cada significado mantém seu desenho, com rótulo e SVG decorativo. Editor e skeleton compartilham inventário de ações. Nenhum item raiz novo na sidebar.

F37: channels representa duas escolhas/saídas, distinta de link/invite/interaction; primaryLink representa botão principal com outros botões menores, distinto de favoritos. Editar/remover/voltar/atualizar conservam desenhos do mesmo significado. Rede usa FacetIcon existente, acompanhada de nome e texto; nenhum ícone sozinho identifica a escolha. Entrada contextual em Minha página, sem novo item raiz; skeleton compartilha ProfileGroupActions.

## F05 — Categorias seguidas (19/10/2026)

`followNiche`: marcador com sinal de adição, para seguir categorias e destino Categorias seguidas no desktop/mobile. Distingue Favoritos (estrela), lembretes (sino) e assinatura comercial. Configurar/salvar seguem os ícones de ações compartilhadas. Validado nos testes de navegação e nas capturas F05.

F15: campaignPages representa páginas de campanha (folha e bandeira), distinto de profile, publish e export. F20: teamAccess representa colaboradores com acesso ao recurso (duas pessoas), distinto de account e permissões administrativas.

F21: mediaKit representa apresentação comercial com resultados (documento com quadro de dados), sem compartilhar desenho com perfil, campanha, relatório ou download. A miniatura da marca pública reutiliza PersonalPageBrand, sem segunda identidade visual.

## Refinamento de contextos — 19/10/2026

Publicação removida da sidebar. Minha página passa a conter destinos reais: pageSummary (visão geral da página), pageIdentity (dados), pageGroups (grupos/links), appearance, templates, importLinks, download, history, checklist, interaction, campaignPages e mediaKit (Apresentação para parceiros). profile identifica o agrupamento Minha página; não usa o desenho de seu resumo. email e phone identificam contatos, sem reutilizar símbolos de conta ou configurações. Subitens mostram seus próprios ícones em desktop/mobile. Colaboradores enxergam somente destinos concedidos; grupos vazios desaparecem.

## Equipe guiada — 19/10/2026

Os perfis de acesso reutilizam os desenhos existentes pelo mesmo significado: edit = editar conteúdo, eye = visualizar, settings = configurar permissões. As cores azul, verde e violeta acompanham rótulos e descrições; não comunicam permissão sozinhas. Abas ficam textuais para não duplicar símbolos de destinos diferentes.

## Perfis e categorias de acesso — 19/10/2026

workspaceAdmin e workspaceOperator identificam as funções Administrador e Operador, com desenhos exclusivos. permissionContent, permissionTools, permissionTracking e permissionFinance representam as respectivas áreas de conteúdo, ferramentas, acompanhamento e financeiro. permissionAdminOperations, permissionAdminCommercial e permissionAdminSystem distinguem os três grupos administrativos. Analista usa acompanhamento; Financeiro usa a mesma área financeira. Editar e visualizar mantêm edit e eye, inclusive nos atalhos preenchidos. Ban indica a restrição “Sem acesso”. Somente down gira nas categorias, preservando a orientação do ícone da área. [Matriz e validação](evidencias/equipe-perfis-2026-10-19/README.md).

## F22/F23/F25 — destinos distintos

contactForm identifica o formulário público/configuração e difere do contactInbox de respostas recebidas. search mantém o significado de busca no card da Página; preview mantém o significado de simulação em todas as abas. Criar do meu jeito usa edit; Criar com ajuda usa profileAssistant. Salvar/excluir/retornar/expandir preservam os desenhos das mesmas ações. Ícones decorativos acompanham rótulos; não substituem o nome da ação. [Refinamento](../planejamento-features/refinamento-f22-f23-f25.md).

contactInbox representa contatos recebidos; inviteDistributor, distribuição entre convites; profileAssistant, o assistente da página; generateSuggestion, a ação de gerar sugestão; resume, retomada de destino pausado. Desenhos distintos, com rótulos visíveis nas ações; consulta/download/exclusão/salvar reutilizam o significado existente. Novos destinos integram a navegação por seções, heading, skeleton e filtros de permissão global. [Provas desktop/mobile e hashes](../planejamento-features/execucao-f25.md).


F28: domainOwnership identifica controle do domínio (janela web com confirmação), distinto de confirmação de e-mail, equipe e moderação. Reutilizado no título/ação somente para esse significado. Revogar usa a ação disable já existente.
