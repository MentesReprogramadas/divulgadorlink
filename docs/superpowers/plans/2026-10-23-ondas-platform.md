# Ondas Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Migrar o frontend inteiro para a direção Ondas aprovada e tornar reais os anexos opcionais de links.
**Architecture:** Next15/React19 existentes; apresentação em CSS Modules e tokens compartilhados, servidor para carregamento e autorização. Material atmosférico reutilizável independente de mocks. Migração por famílias com fronteiras de escrita explícitas e validação central serial.
**Tech Stack:** Next15.5.26, React19, TypeScript strict, CSS próprio, npm, Vitest/Playwright, Fastify/Prisma/PostgreSQL e processamento raster instalado.
**Spec:** `docs/superpowers/specs/2026-10-23-ondas-platform-design.md`.

## Global Constraints
- Branch existente `codex/roadmap-f37-testes`; sem checkout destrutivo, novas branches/worktrees, commits/push/deploy.
- Navy `#0a192f`, turquesa `#4af9eb`, Outfit e Source Sans 3; sem UI kit/dependências novas.
- Preservar gate/sessão/tenant/cobrança/moderação/quotas/analytics/SEO e dados existentes.
- Cards sem imagem omitem foto; público só vê mídia aprovada.
- Não substituir páginas reais por mocks ou sobrescrever o canvas personalizado de publicadores.
- Runners E2E serializados; portas/containers só próprios; dirty tree preservada.

## Review Focus
1. Card sem foto não reserva altura; título longo e favorito independente permanecem acessíveis (T3).
2. Upload inválido/cross-tenant/usuário suspenso não grava/exibe mídia; pendência não vira aprovação textual (T2).
3. Select/DatePicker dentro de diálogo preservam portal/foco/Escape (T1/T6).
4. Páginas personalizadas preservam configuração mesmo com tema global escuro (T4).
5. Dados reais, rótulos de patrocinado, surfaceToken, consentimento e SSR sobrevivem à migração (T3/T6).

## T0 — auditoria, spec e instalação
- [x] Confirmar branch/dirty tree e consultar grafo; inventariar rotas e contratos.
- [x] Instalar skills oficiais de obra/superpowers com instalador local; registrar padrão global preservando preferências.
- [x] Escrever spec/plano; direção e execução autorizadas no pedido, sem nova pausa estética.
- [x] Builder-check fresco e incorporar lacunas materiais.
- [x] Criar matriz de todas as rotas e ledger de execução, sem marcar páginas não vistas como validadas.

## T1 — fundações, shell e primitivas
**Files:** `styles/{tokens,foundations,components,workspace,operations,authentication,promotions,consent}.css`, `components/layout/site-shell*`, `components/ui/*.module.css`, `features/account/components/workspace.module.css`; novos `components/layout/ondas-atmosphere*`/material em `components/ui` se responsabilidade real.
**Interfaces:** tokens semânticos mantêm nomes existentes; `--color-brand-navy` continua marca literal, cor de links passa a papel legível. Atmosfera decorativa com pausa e reduced-motion sem dados/session.
- [x] Inspecionar consumidores e testes; registrar baseline antes de modificar.
- [x] Extrair/reusar material Ondas sem trazer dados/navegação demo; tematizar controles, sidebar, tabelas, diálogos, feedback e loading.
- [x] Exercitar botões/campos/Select/DatePicker/dialog com teclado; preservar asserções de comportamento e contratos (ajustes de expectativas visuais obsoletas registrados no ledger).
- [x] Lint/tipos/unitários afetados e revisão do lote.

## T2 — anexos persistidos e moderados de Link
**Files:** schema/migração aditiva Prisma, novo módulo `backend/src/domain/links/link-media*`, repositório e rotas de mídia link; consumidores `public-link-view`, DTOs, BFF binário; formulário novo/edição e fila administrativa.
**Interfaces:** DTO público ganha URLs opcionais `iconUrl?: string|null`, `imageUrl?: string|null`; detalhes/descrição continuam existentes. Escolher naming/storage conforme auditoria e documentar antes de publicar interfaces.
- [x] Escrever testes falhando: tipos inválidos, limites, owner/tenant/suspensão, pendência/remoção/aprovação/rejeição.
- [x] Reusar raster seguro e uploads existentes com vínculo Link próprio; guardar pendente, não publicar via aprovação textual.
- [x] Adicionar campos opcionais no fluxo real, preview/remover/erros e controles de análise administrativa.
- [x] Validar roundtrip privado→moderação→público e rollback de falha; backend lint/type/test/build e frontend testes afetados.

## T3 — catálogo, busca, detalhes e conta públicos
**Files:** `features/catalog/**`, `components/domain/link-row*`, `app/link/[id]/page.tsx`, `components/forms/*`, aquisição e páginas públicas/auth/legal. Sem editar T1 nem gate/analytics.
**Interfaces:** consumir DTO real T2; `LinkRow` aceita iconUrl/imageUrl opcionais e mantém href/contexto/ações. Materiais T1 via tokens; sem dependência da feature demo.
- [x] Testes: foto omitida quando ausente, mídia aprovada quando presente, sem texto sobre imagem; favorito não navega; surfaceToken preservado.
- [x] Reimaginar home real com hero aprovado e busca/sugestões reais, facetas e destaques; adaptar detalhe, login/cadastro/recuperação, landing/legal.
- [x] Verificar SSR/SEO, erros/vazio/longo/mobile e jornadas existentes; revisão do lote.

## T4 — todas as ferramentas de painel e administração
**Files:** CSS/TSX de features agência, perfis, billing, canais, campanhas, contatos, ownership, redirect, integrações, moderação etc. Componentes de domínio e rotas operacionais restantes; não editar T1/T2/T3.
- [x] Percorrer os 42 diretórios, identificar e migrar superfícies/cores literais e componentes específicos, sem blanket de seletores ou alterar regras.
- [x] Aplicar material com densidade adequada a tabelas, filtros, editores, settings, métricas, pedidos e avisos.
- [x] Preservar customização de ProfileView/CampaignView/MediaKitView/previas e isolamento de sessão/tenant.
- [x] Executar testes existentes das features, revisar diffs e registrar cada família na matriz.

## T5 — cobertura total e consistência
**Files:** `docs/superpowers/ondas-route-matrix.csv`, docs/ledger e correções específicas pendentes.
- [x] Conciliar 95 rotas, seis layouts, 38 loading, estados globais e componentes por família; nenhum “completo” sem evidência.
- [ ] Capturar e abrir telas em desktop/mobile, 320px/200%zoom, menus abertos, foco/erro/vazio e anexos ausentes.
- [ ] Detector e revisão visual independente com capturas atuais; corrigir lote material e recapturar.

## T6 — regressão integrada e fechamento
- [x] Frontend lint/typecheck/Vitest/build e backend checks quando alterado, sem ocultar falhas preexistentes.
- [ ] E2E serial real publicação/anexos/moderação/catálogo/detalhe, autenticação e ferramentas de cada família; seed determinístico.
- [ ] Revisão independente de contratos e código; revisão visual; atualizar DESIGN.md/sidecar a partir da implementação aprovada (não por intenção).
- [x] Atualizar grafo incremental e docs com resultados, limites, matriz e reversão. A migração só poderá ser declarada completa após as conferências de runtime ainda abertas.

## Execução e decisões

### Correção de paridade solicitada após a primeira adaptação

O usuário rejeitou a interpretação visual da plataforma e determinou a preview Ondas como referência exata. Esta correção substitui a aprovação visual presumida na primeira adaptação. Autoridade e medidas estão em `../2026-10-23-ondas-preview-parity.md`.

- [x] Comparar a preview correta (`WaveHome`, `WaveLinkCard`, `WaveLinkDetail`) com a plataforma e registrar divergências.
- [x] Extrair a mesma LiquidLens/optics e o mesmo CSS para compartilhamento; restaurar composição, materiais, grid, busca, cards e detalhe com dados reais.
- [x] Aplicar a lente a controles/shell/sidebar; ícones monocromáticos, scrollbar no material da marca e remoção do botão Pausar ondas.
- [x] Preservar anexos opcionais, idade, saída, impressões, favoritos, filtros, paginação, SEO e cores das páginas pessoais; revisão independente de fonte.
- [x] Concluir os checks integrados do novo código e registrar os resultados reais: lint/tipos,175 arquivos/600 testes e build final passaram; inspeção visual continua separadamente pendente.
- [ ] Servir o novo build e verificar visualmente desktop/mobile, teclado e estados. O reinício normal autorizado foi recusado pela ferramenta (`blocked by policy`); não contornar nem chamar capturas antigas de aprovação atual.
O pedido determina execução, preservando autonomia já autorizada. T1/T2/T3/T4 têm donos disjuntos; interfaces são coordenadas pelo agente principal, sem runners E2E paralelos. Aprovações de spec/plano não serão solicitadas de novo por sugestão das skills, conforme AGENTS e autorização direta. Nenhum commit sugerido pelas skills será executado. Recursos que dependam de estado externo indisponível ficam explicitamente pendentes, sem resultados inventados.

Fechamento: implementação, mídia real, 95 rotas inventariadas/revisadas por estado e build normal final registrados. A revisão automática de permissões bloqueou reiniciar o frontend e iniciar uma alternativa local, retornando somente `blocked by policy`. A demo continua em `http://ondas.localhost:3013` no build anterior às últimas correções. Recaptura do build final, regressão W09/W07/admin e zoom real continuam abertos; não declarar aprovação final das telas corrigidas só pela fonte/build. Ver `ondas-platform-validation.md`.
