# Ondas — ferramentas e administração (T4)

Implementação de apresentação em 23/10/2026, na árvore compartilhada da branch existente. Direção aprovada pelo usuário: navy/turquesa e Liquid Glass, modo Operate nas ferramentas. Taste, Impeccable e Emil aplicados sem nova escolha estética. O breve autorizado substitui entrevista adicional neste subagente.

## Cobertura de código

Os 42 diretórios originais foram classificados entre os responsáveis do plano. Este lote consultou 35 famílias e 58 CSS Modules, incluindo o UI Lab sem folha própria; a nova feature link-media fica com T2. Foram modificados 37 arquivos de apresentação (34 CSS Modules e três TSX). Módulos já semânticos foram preservados e recebem o material compartilhado de T1. Herdar tokens não equivale a validar a rota visualmente.

| Família | Tratamento neste lote | Visual desktop/mobile |
| --- | --- | --- |
| administration | Estados publicados/pendentes/rejeitados usam tokens; filtros e foco legíveis, popup fosco; removido acento grosso redundante. | Pendente no runner integrado |
| agency | Aviso de risco usa fundo, borda e texto de erro; navegação existente usa tokens. | Pendente no runner integrado |
| availability | Filtros, cards e gráficos já usam superfícies e texto semânticos; preservados. | Pendente no runner integrado |
| contact-forms | Ferramentas já usam tokens; formulário público herda a paleta local de ProfileView; personalização mantida. | Pendente no runner integrado |
| content-review | Fila, revisão e estados já usam superfícies semânticas; preservados. | Pendente no runner integrado |
| favorites | Pasta, hover e foco legíveis; estrela herda a cor semântica, erros usam tokens. | Pendente no runner integrado |
| media-kit | Ferramentas, badges de publicação e loading adaptados; conteúdo público mantém --page-* do proprietário. | Pendente no runner integrado |
| moderation | Denúncias e revisão já usam tokens; fila de mídia pertence ao lote T2. | Pendente no runner integrado |
| niche-follows | Resumo ativo e digest usam semântica de sucesso em superfície escura. | Pendente no runner integrado |
| ownership | Cards, etapas e ações existentes usam tokens; sem alteração de verificação ou transferência. | Pendente no runner integrado |
| permanent-qr | Controles já usam tokens; região branca do QR mantida para leitura e exportação. | Pendente no runner integrado |
| platform-webhooks | Cards, segredo, histórico e menus já usam tokens; contratos e tratamento de segredos preservados. | Pendente no runner integrado |
| profile-assistant | Cards, comparação e seleção já usam tokens; preservados. | Pendente no runner integrado |
| profile-billing | Plano destacado usa ação e borda legíveis; preço mantém hierarquia fixa, checkbox usa token existente. | Pendente no runner integrado |
| profile-campaigns | Ferramentas já usam tokens; CampaignView continua usando o canvas personalizado de ProfileView. | Pendente no runner integrado |
| profile-channels | Toggle selecionado usa texto da ação; grupos, escolhas e prévia preservam paleta local. | Pendente no runner integrado |
| profile-checklist | Etapas e progresso já usam tokens; estados e autorização preservados. | Pendente no runner integrado |
| profile-diagnostics | Evidências e cards já usam tokens; diagnóstico e métricas preservados. | Pendente no runner integrado |
| profile-discovery | Faceta ativa usa tinta da ação; cartões e filtros usam tokens compartilhados. | Pendente no runner integrado |
| profile-events | Ação de inscrição usa fallback semântico; evento público continua com --page-* / --button-*. | Pendente no runner integrado |
| profile-hosts | Cards/endereço usam tokens; gap inválido substituído por espaçamento existente. | Pendente no runner integrado |
| profile-import | Superfícies e estados preservados; token tipográfico inexistente corrigido. | Pendente no runner integrado |
| profile-interaction | Métricas, alcance, barras e responsive já usam tokens; não alterado cálculo/mensuração. | Pendente no runner integrado |
| profile-team | Loading derivado da tinta semântica; equipe e ações preservadas. | Pendente no runner integrado |
| profile-templates | Aviso usa semântica de atenção; swatches continuam exibindo cores reais do template. | Pendente no runner integrado |
| profiles | Editores, histórico, grupos, idiomas, foco e banners adaptados; menus usam superfície fosca; canvas público isolado da paleta global. | Pendente no runner integrado |
| promotions | Gráficos e marcadores usam acento legível; aviso semântico; dados/tabelas preservados. | Pendente no runner integrado |
| redirect-pools | Seleção e divisão usam acento legível; alerta de indisponibilidade semântico. | Pendente no runner integrado |
| redirects | Estados e ícone do convite legíveis; avisos, erros e sucesso sem pastéis claros. | Pendente no runner integrado |
| renewal-reminders | Tokens antigos/inexistentes substituídos por papéis existentes; cards e aviso tematizados. | Pendente no runner integrado |
| search-opportunities | Badge usa superfície semântica; fallback claro removido. | Pendente no runner integrado |
| share-kit | Ferramentas já usam tokens; imagem e cores da arte exportada preservadas. | Pendente no runner integrado |
| support | Banner de atendimento usa semântica de atenção legível. | Pendente no runner integrado |
| ui-lab | Sem CSS Module próprio; componentes compartilhados recebem o tema do lote T1. | Pendente no runner integrado |
| workspace-team | Permissões, etapas, perfis e ações rápidas usam semântica legível; seleção tem acento de produto, sem alterar capacidades. | Pendente no runner integrado |

Catálogo, aquisição/autenticação/legal, conta/shell/primitivas, previews experimentais e formulários/fila de mídia pertencem aos outros lotes. Não houve alteração em gates, sessão, transporte, tenant, preços, quotas, moderação, analytics, SEO ou persistência neste lote. Rotas administrativas sem CSS específico usam os componentes compartilhados existentes.

## Personalização pública

ProfileView continua recebendo background, buttonColor, fonte, radius, alinhamento e demais escolhas existentes. personal-page.module.css limita color-scheme e tokens de campo, texto, ação, foco, erro/sucesso/atenção ao canvas. CampaignView e MediaKitView continuam usando esse renderer. Formulários públicos, busca, eventos, previews e blocos mantêm --page-* / --button-*. Apenas skeleton sem dados usa as cores de marca enquanto aguarda a aparência. Swatches, bandeiras, arte exportada e fundo branco do QR não foram recoloridos como chrome de ferramenta.

## Evidência executada

- Vitest das 33 famílias com testes existentes: 87 arquivos e 299 testes passaram; log em output/ondas-t4/vitest.log (24,67 s). support e ui-lab não têm teste próprio neste recorte.
- Reexecução final de renderer/prévia/criação de perfil, template, favorito e relatório: seis arquivos e 18 testes passaram; output/ondas-t4/vitest-final.log (2,18 s).
- ESLint dos três TSX alterados: passou.
- Parser PostCSS: os 34 CSS Modules alterados foram analisados sem erro.
- Impeccable detector: executado uma vez sobre os arquivos alterados; apontou dois acentos grossos em bordas arredondadas. Ambos foram removidos, mantendo identificação textual de estado. Resultado bruto anterior à correção em output/ondas-t4/detector.json.
- Grafo existente consultado para relações de profiles/agency/billing/media-kit e confirmado no código. CSS não é coberto estruturalmente; atualização incremental global pertence ao fechamento T6.

## Limites e próximos checks

Não executei build, typecheck geral ou E2E paralelo: runner integrado e inspeção real estão centralizados no agente principal, conforme o plano. A única porta 3013 observada era a cópia antiga da galeria e não foi usada como prova desta implementação. Nenhuma rota foi marcada como visualmente validada neste relatório.

Pendente: observar ferramentas reais autenticadas desktop/mobile, 320 px/zoom 200%, teclado/foco/menus, contraste composto, reduced-motion e fallback de transparência. Priorizar ProfileView claro/escuro com busca e formulário público, CampaignView, MediaKitView, seleção de permissões, assinatura/checkout, histórico/avisos e gráficos de destaque. A matriz central docs/superpowers/ondas-route-matrix.csv continua sendo a fonte de estado por rota; este relatório documenta cobertura de código, não 95 aprovações visuais.

## Arquivos e reversão

Snapshot UTF-8 imediatamente anterior a cada edição do lote: output/ondas-t4/baseline.json. Para reverter, remover somente os hunks de apresentação deste lote ou comparar arquivo a arquivo com o snapshot, preservando alterações anteriores e posteriores da árvore compartilhada. Não usar reset/checkout amplo. Sem dependências, lockfiles, commits, branches, push ou deploy criados neste lote.

- `frontend/src/features/administration/components/admin-links-board.module.css`
- `frontend/src/features/administration/components/facet-summaries.module.css`
- `frontend/src/features/administration/components/link-promotion-editor.module.css`
- `frontend/src/features/agency/agency.module.css`
- `frontend/src/features/favorites/components/favorite-button.tsx`
- `frontend/src/features/favorites/components/favorites.module.css`
- `frontend/src/features/media-kit/media-kit.module.css`
- `frontend/src/features/niche-follows/niche-follows.module.css`
- `frontend/src/features/profile-billing/billing.module.css`
- `frontend/src/features/profile-channels/channels.module.css`
- `frontend/src/features/profile-discovery/discovery.module.css`
- `frontend/src/features/profile-events/event.module.css`
- `frontend/src/features/profile-hosts/profile-host.module.css`
- `frontend/src/features/profile-import/import.module.css`
- `frontend/src/features/profile-team/team.module.css`
- `frontend/src/features/profile-templates/templates.module.css`
- `frontend/src/features/profiles/components/personal-page.module.css`
- `frontend/src/features/profiles/components/profile-appearance-editor.module.css`
- `frontend/src/features/profiles/components/profile-changes.module.css`
- `frontend/src/features/profiles/components/profile-creation-choice.module.css`
- `frontend/src/features/profiles/components/profile-editor-toolbar.module.css`
- `frontend/src/features/profiles/components/profile-groups.module.css`
- `frontend/src/features/profiles/components/profile-history.module.css`
- `frontend/src/features/profiles/components/profile-overview.module.css`
- `frontend/src/features/profiles/components/profile-preview-skeleton.tsx`
- `frontend/src/features/profiles/components/profile-preview.module.css`
- `frontend/src/features/profiles/components/profile-search.module.css`
- `frontend/src/features/profiles/components/profiles.module.css`
- `frontend/src/features/profiles/profile-languages.module.css`
- `frontend/src/features/promotions/components/performance-charts.tsx`
- `frontend/src/features/promotions/components/performance-report.module.css`
- `frontend/src/features/redirect-pools/pool.module.css`
- `frontend/src/features/redirects/components/redirects.module.css`
- `frontend/src/features/renewal-reminders/components/renewal-reminders.module.css`
- `frontend/src/features/search-opportunities/search-opportunities.module.css`
- `frontend/src/features/support/support-banner.module.css`
- `frontend/src/features/workspace-team/workspace-team.module.css`
