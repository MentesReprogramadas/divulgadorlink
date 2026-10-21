# Plano de implementação F36 — Clientes e agência

**Estado:** S0–S6 CONCLUÍDA_LOCAL em 21/10/2026; S7 EM REVISÃO. [Spec vinculante](../specs/f36-agencias.md), [decisão e execução](../execucao-f36.md), [teste local](../testar-lote-2026-10-21.md). Ordem 40, depende de G00/F42/F20/F11/F21. Branch `codex/roadmap-f37-testes`, WORKTREE; sem novo commit/push/deploy. Parar aqui: F40/F41 não iniciadas.

## F36-S0 — Escopo, decisão e reuso

- [x] Confrontar AC01–AC05, grafo e FKs reais; mapear editor, convites, planos, métricas, fotos, contatos e snapshots.
- [x] Resolver D38: dez clientes técnicos, contas reais, cobrança individual existente, equipe por cliente aprovada, transferência com dois titulares e sete dias.
- [x] Registrar alternativas descartadas e limitações comerciais sem criar oferta cobrada.

## F36-S1 — Contratos e testes de comportamento

- [x] Schemas Zod de cliente, pedido e transferência, versão/idempotência, validação de titularidade.
- [x] Domínio e hooks/componentes: escopo de respostas, 403 limpa dado privado; erro de rede conserva dados e formulário.
- [x] Definir oráculos T01–T05 e compartilhamentos F20 legados como regressão.

## F36-S2 — Persistência e invariantes

- [x] Migração aditiva `20261021170000_agency_clients`; validar com Prisma e PostgreSQL descartável.
- [x] Índices/constraints compostas de tenant/página/dono, limite técnico, estados, requestKey e retenção.
- [x] Tornar adiáveis somente as FKs que propagam dono; preservar validação imediata fora da transferência.
- [x] Permitir somente atualização de dono em revisão imutável no contexto de transferência; JSON permanece idêntico.
- [x] Provar rollback de FK futura não preparada sem revogações parciais.

## F36-S3 — API, autorização e worker

- [x] Compor `/me/agency/{clients,access,transfers}` no módulo Profiles existente, reusando ator real/BFF/CSRF.
- [x] Validar `agency.read/write`, papéis por página, equipe global e vínculo derivado versionado; não conceder OWNER por delegação.
- [x] Transferir página/filhos atomicamente com locks, CAS e dois aceites; não mover assinatura/catálogo/webhooks.
- [x] Revogar equipe antiga, invalidar revisão, parar teste e pausar descoberta/medição na transferência.
- [x] Reconciliar concessões inválidas em lotes de cem e reter provas ativas; expirar pedidos/limpar encerrados após 180 dias.

## F36-S4 — Painel e estados

- [x] Clientes, acessos e transferências com estrutura, skeleton, filtros e componentes da casa; sem dependência nova.
- [x] Reutilizar editor e métricas identificando cliente; sem controles de medição no relatório compartilhado.
- [x] Reutilizar troca de workspace com navegação completa e destino validado, evitando mistura de estado.
- [x] Navegação por links semânticos, Select quando apertado, teclado/foco/320px; corrigir auditoria Axe que detectou semântica de abas inadequada.
- [x] Vazio orienta convite real em Equipe → Acessos por página; remoção e transferência têm confirmação adequada.

## F36-S5 — PostgreSQL e falhas

- [x] `agency.pg.spec.ts`: seis testes reais de capacidade, isolamento, acessos, retenção, relatório, CAS e transferência.
- [x] Verificar JSON histórico, fotos comprimidas, contatos/notas, assinatura inalterada, revogação, descoberta/medição e teste encerrado.
- [x] Verificar perda de confirmação após pedido e falha de esquema; nenhuma transferência parcial.
- [x] Regressões de profiles, profile-team, profile-interaction, contact-forms, discovery e webhooks: 69 testes aprovados no lote.

## F36-S6 — Playwright e inspeção

- [x] `e2e/agency.spec.ts` registrado em features/features-mobile; API real e convite F20 pela interface.
- [x] E01 dois clientes/edição/métricas; E02 solicitação e aceite específico/revogação; E03 transferência com falha conservando dados e dois consentimentos.
- [x] Revisar capturas desktop/mobile, erros em 320px, foco/teclado e Axe nos cenários executados.
- [x] Regressão F20/F19/F31 e resultado completo vinculados no registro de execução.

## F36-S7 — Gate remoto e fechamento

- [x] Lint/typecheck dos dois pacotes, unitários afetados, builds e evidências locais registradas na execução.
- [x] Atualizar spec, plano, matriz, roadmap, decisões, grafo e instruções de teste/retomada.
- [ ] CI real associado a commit, revisão e aceite final.
- [ ] Ensaio de rollout/reversão em staging, validação de dados/backup e migração em ambiente autorizado.
- [ ] Commit, push, deploy e configuração de produção mediante autorização específica. Não executar por consequência deste plano.

Para reverter a entrada nova, retirar navegação e rotas novas mantendo dados compatíveis; revogar vínculos derivados por operação auditada. Não usar reset/drop nem mover assinaturas para desfazer a página. Transferência aceita volta somente com novo pedido consentido. Estado auditável por etapa no CSV, evidências detalhadas na execução.
