# F35 — Atendimento de contatos recebidos

Implementação local em 21/10/2026. **Painel → Minha página → Contatos recebidos → Atender**. Sem commit, push, deploy ou migração no banco pessoal/de produção nesta rodada.

## Decisões, alternativas e reuso

Reutilizados formulário/contato da F22, permissões globais, auditoria, modal, seletor, abas responsivas e expurgo de contatos. Cada contato tem situação **Novo, Em atendimento ou Concluído**, notas privadas e histórico. Não foi criado um CRM paralelo nem envio de mensagens ao visitante. Alternativa de status livre foi descartada para manter filtro e operação simples.

`firstHandledAt` é definido uma única vez na primeira mudança de Novo para outra situação; adicionar nota não inicia atendimento. Reabrir é permitido e não altera o primeiro atendimento. Mesma situação com mesma versão é operação idempotente. Notas têm UUID do cliente, até 2.000 caracteres e limite técnico de 50 por contato. Repetir criação com mesmo ID/texto devolve o registro; outro texto conflita. Histórico guarda ator, data, situação e ID da nota, sem copiar texto privado. Paginação de 50 alterações.

Lock por contato e versão esperada evitam sobrescrever edição concorrente. A interface conserva texto em falha de rede; respostas atrasadas de filtros não substituem uma busca mais recente. Colaborador com leitura consulta; escrita permite atendimento/notas. Exportar e excluir exigem permissões específicas **contactsExport** e **contactsDelete**: concessões antigas não são ampliadas. API e UI aplicam essas regras. Colaborador de outro espaço/tenant não recebe contato, notas ou histórico.

Origem é fixada no recebimento pelo banco. Contatos antigos recebem o slug atual da página no backfill; não é possível reconstruir aliases históricos que não foram registrados. Datas de recebimento e origem não mudam no atendimento. CSV inclui situação/origem/primeiro atendimento e exclui notas privadas. Exclusão e retenção original de 180 dias removem notas/histórico em cascata. Nenhum desses dados entra na página pública ou nos webhooks novos.

## Evidências locais

- Domínio e permissões: 6 testes aprovados.
- PostgreSQL/HTTP da F22/F35: 8 testes aprovados, incluindo concorrência, idempotência, isolamento, revogação, exportação, exclusão e retenção.
- Componentes de atendimento: 3 testes aprovados; regressão conjunta de formulários e integrações: 10 aprovados.
- Playwright F22/F35: 17 aprovados. Após adequação das abas para 320px, execução dirigida F35: **5 aprovados**, desktop/mobile e setup, em 50,1s. As primeiras repetições revelaram um helper que aguardava seletor desmontado no desktop; corrigido sem alterar a regra de produto.
- Axe no modal: nenhuma violação nos critérios automatizados executados. Capturas desktop e 320px inspecionadas em `docs/frontend-profissional/evidencias/f35-atendimento-2026-10-21/`. Revisão posterior corrigiu token de espaçamento inexistente; regressão conjunta aprovada no fechamento registrado em execucao-f36.md.
- Lint/typecheck frontend e backend e build backend aprovados. Build frontend e consolidação conjunta aprovados no fechamento; não representam validação de produção.

## Migração, liberação e reversão

Migração aditiva `20261021140000_contact_handling`, aplicada somente ao PostgreSQL descartável de testes. Antes de liberar, executar CI e migração em ambiente autorizado. Para reverter a interface, remover o acesso ao atendimento; manter as tabelas/colunas até confirmar preservação ou exportação dos dados. Não fazer rollback destrutivo automático. S7 permanece em revisão local.

## Fechamento do lote — 21/10/2026

Lint/typecheck e builds dos dois pacotes: exit 0 (build Next em cópia isolada para preservar servidores de outras tarefas). Consolidação: 32 testes backend/domínio, 69 PostgreSQL e 136 frontend aprovados. Playwright final F36/F20/F19/F31: 25 aprovados, zero skips/flaky/falhas; resultados anteriores específicos desta feature permanecem acima. Atualização incremental do grafo e inspeção das capturas concluídas. Detalhes e JSON: [execução F36](execucao-f36.md); [como testar/configurar](testar-lote-2026-10-21.md). F40/F41 não iniciadas. S7/CI/deploy continuam pendentes; nenhuma migração no banco pessoal e nenhum novo commit/push.

Atualização posterior autorizada em 21/10/2026: migrations do lote aplicadas também no PostgreSQL local `localhost:5437/divulgador`, com backup fora do repositório, status atualizado e Prisma Client gerado. Commit/push deste lote autorizados na branch `codex/roadmap-f37-testes`; detalhes em [execução F36](execucao-f36.md). Produção não alterada.


## Revisão de fluxo posterior — 21/10/2026

F35 revalidada na revisão explícita das sete áreas, incluindo navegação por contextos, hierarquia, componentes da casa, busca/filtros e permissões. Resultados anteriores permanecem históricos. Mudanças, testes reais e evidências em [revisão consolidada](../frontend-profissional/revisao-fluxos-2026-10-21.md). Esta revisão está na árvore local, sem novo commit/push/deploy.
