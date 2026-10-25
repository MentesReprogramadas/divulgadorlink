# F40 — Melhorar minha página

**Estado:** IMPLEMENTADA LOCALMENTE; S0–S6 validadas e S7 pendente em 21/10/2026. Ordem 41, onda 6. [Execução/D42](../execucao-f40.md), [plano](../planos/f40-diagnostico.md). Pedido vigente: revisão explícita F24/F30/F35/F39/F26/F36/F40, sem iniciar F41. Branch codex/roadmap-f37-testes, WORKTREE; sem commit/push/deploy desta revisão.

## Objetivo e jornada

Oferecer sugestões práticas com motivo, evidência e próxima ação. Painel → Resultados e divulgação → **Melhorar minha página** (`/painel/perfil/diagnostico`). Selecionar período/tipo atualiza automaticamente. Dono ou colaborador autorizado pode revisar grupos e links ou ignorar por até trinta dias. Não altera texto, destino, publicação, plano ou medição automaticamente.

Dependências: G00/F42 (prioridade), F09, F07 e F31. Usa configuração salva, publicação e disponibilidade/analytics existentes. Não cria serviço de rastreamento/checagem externa, preço, quota ou hipótese de causalidade.

## D42 — Contrato concreto

- Regras determinísticas v1: títulos repetidos, mais de vinte botões marcados visíveis (sugestão, não quota), destino de catálogo com estado UNAVAILABLE, interação abaixo de 1% após cem impressões por botão. Ocultos não entram na análise estrutural. Títulos são comparados com trim/NFKC e sem distinção de caixa.
- Interação da publicação atual, período 7/30/90 dias na UI, padrão 30, no calendário America/Sao_Paulo da F31. API aceita intervalo válido de até 180 dias dentro da retenção existente. Não considera evento fora do período. Evidência inclui revisão, ordem salva, impressões e cliques, sem comparar botões em posições diferentes como se tivessem igual exposição.
- Cobertura separa AVAILABLE, NO_DATA, PAUSED, NO_PLAN e NO_PERMISSION. Não atribui baixo desempenho quando falta amostra, cobertura ou permissão. Apenas visitas elegíveis com consentimento já coletadas pela F31.
- URLs próprias não ganham checagem fictícia. Cobertura informa quantidade não testada automaticamente; F07/catalogo é a fonte de estados conhecidos. Estado transitório SUSPECT/INCONCLUSIVE não vira indisponibilidade definitiva por esta análise.
- Ignorar: chave estável de regra/versão/contexto, vinculada à versão do rascunho e, para métricas, revisão publicada. AuditLog registra somente key/ruleVersion/ator/escopo; leitura considera trinta dias. Mudança de versão reavalia. Repetição é idempotente sob lock. Sem tabela/migration nova e sem apagar auditoria para simular reversão.
- Limites de interpretação e alternativas descartadas estão na execução. Nenhuma garantia de crescimento ou inferência causal.

## API e autorização

`GET /api/v1/me/profile/diagnostics?from&to` → `{page,findings,ignored,coverage,range,revision,unverifiedUrls}`. Finding contém `{key,code,title,reason,actionPath,actionLabel,blockId,position,evidence,ruleVersion}`. `POST /me/profile/diagnostics/:key/dismiss` recebe `{ruleVersion,from?,to?}` e retorna `{ok:true}` após persistência. Tenant deriva de host/sessão; cache privado/no-store, CSRF e BFF existentes. Chaves são SHA-256, não texto pessoal.

`page.read` permite leitura; `page.write`/EDIT permite descarte. Compartilhamento global precisa também de `reports.read` para métricas; pertencer à página não contorna o grant de relatórios. Compartilhamento legado mantém seus papéis existentes. Chave de outra página não opera fora do escopo. 400 inválido, 401 sem sessão, 403 sem direito, 404 página ausente para descarte, 409 sugestão/regra obsoleta, 422 período inválido. Falha de rede conserva seleção; revogação limpa dado privado.

## Reuso e interface

Reutiliza readProfile, disponibilidade do catálogo, medição/relatório F31, auditoria, PageHeader, WorkspaceActions/WorkspaceFilters, Select, MetricCards, feedback e skeletons da casa. Regra pura em domain/profiles/profile-diagnostics.ts; composição em repositories/profile-diagnostics.ts; telas em features/profile-diagnostics. App compõe rotas privadas e loading. Sem biblioteca nova.

Uma ação principal por tarefa; filtros fora dos cards de resultado; motivo e números hierarquizados. CTA para plano quando sem cobertura, para medição quando pausada e para edição quando há sugestão. Datas respeitam o mesmo dia de São Paulo mesmo após meia-noite UTC. Skeleton preserva ações, filtros, resumos e cards sem duplicar filtros durante refresh. Desktop/mobile/320px e teclado nos cenários E2E.

## Critérios de aceitação da fonte

Cada linha preserva uma obrigação da fonte. Se um critério envolve decisão ainda pendente, resolver a decisão em S0 e adicionar valores/exemplos ao teste antes de implementá-lo. Nenhuma linha pode desaparecer por ser difícil de automatizar.

| Critério | Obrigação observável | Caso rastreável | Camada primária |
| --- | --- | --- | --- |
| F40-AC01 | explicar a razão de cada sugestão | F40-T01 | I/PG |
| F40-AC02 | considerar período, impressões e posição do botão | F40-T02 | I/PG |
| F40-AC03 | diferenciar falta de dados de baixo desempenho | F40-T03 | I/PG |
| F40-AC04 | permitir ignorar sugestões | F40-T04 | I/PG |
| F40-AC05 | não prometer crescimento nem atribuir causalidade a correlações. | F40-T05 | I/PG |

## Mapa de evidências

| Critério | Oráculo |
| --- | --- |
| AC01/T01 | U01, PG01, C01 e E01: motivo/quantidade/ação por sugestão |
| AC02/T02 | U02, PG02: cem impressões, cliques, revisão, ordem e exclusão de fatos fora do período |
| AC03/T03 | U03, PG01/02/03: sem plano/dados, pausa e grant de relatórios separado |
| AC04/T04 | PG01, C01, E01: descarte persistente/idempotente, expira e não muda versão/conteúdo |
| AC05/T05 | U02 e PG02; motivo de interação explicita observação sem causa/garantia; nenhuma ação automática |

Arquivos: domain/profiles/profile-diagnostics.spec.ts; casos F40 em http/profile-checklist.pg.spec.ts e http/profile-interaction.pg.spec.ts; frontend/features/profile-diagnostics/diagnostics-screen.test.tsx; e2e/profile-diagnostics.spec.ts em features e features-mobile. Resultados e capturas no registro de execução; não declarar produção pelo sucesso local.

## Operação e liberação

Sem migration ou segredo adicional. Reiniciar API/frontend; medição paga mantém cobertura F11/F31, sem novas ofertas. S7/CI/produção/rollout remoto pendentes. Reversão retira navegação/rotas novas preservando auditoria, página e medições. Não apagar histórico/contatos nem mover cobrança.

## Fonte integral da feature

**Objetivo:** oferecer sugestões práticas de melhoria a partir da configuração e do uso do perfil.

**Escopo inicial:** apontar títulos repetidos, destinos com problemas, excesso de itens e botões com pouca interação; sugerir ações sem aplicá-las automaticamente.

**Critérios de conclusão:** explicar a razão de cada sugestão; considerar período, impressões e posição do botão; diferenciar falta de dados de baixo desempenho; permitir ignorar sugestões; não prometer crescimento nem atribuir causalidade a correlações.

**Indicadores:** sugestões consultadas, ações adotadas e evolução posterior das métricas, sem atribuição automática de causa.

