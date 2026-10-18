# F19 Prévia e histórico de versões

**Gate de prioridade:** [F42](../specs/f42-evolution-moderacao.md) deve ser concluída antes desta feature, por prioridade definida em 15 de outubro de 2026. Este gate de sequência não cria dependência funcional de WhatsApp para o produto. Ordem de entrega atual: 10.

**Estado:** IMPLEMENTADA E VALIDADA LOCALMENTE; S7 em revisão (CI/liberação pendentes).
**Onda:** 2. **Ordem:** 10.  
**Fonte:** [features-propostas.md](../../features-propostas.md), seção “Prévia e histórico de versões”.  
**Plano:** [F19 implementação](../planos/f19-historico-versoes.md).  
**Dependências obrigatórias:** G00, [F09](../specs/f09-perfil-publico.md).  
**Governança:** [arquitetura](../arquitetura-e-reuso.md), [testes](../qualidade-e-testes.md), [decisões](../decisoes.md), [roadmap](../roadmap-auditavel.md).

## Objetivo e fronteira

permitir revisar mudanças antes de publicar e recuperar configurações anteriores.

Escopo aprovado para detalhamento: rascunho separado da versão pública, prévia para celular e computador e restauração de versões publicadas.

Não ampliar a entrega para capacidades mencionadas como futuras na fonte. Registrar decisão antes de mudar fronteira. Este planejamento não aprova preço, limite, provedor ou publicação. O texto-fonte integral está no final desta spec para permitir revisão de escopo além dos critérios enumerados.

## Jornada e comportamento observável

Ver versões, comparar campos relevantes, restaurar explicitamente para prévia e republicar.

Atores: proprietário autenticado no tenant de origem; visitante apenas em operações públicas expressamente definidas; outro dono do mesmo tenant e dono de outro tenant como controles negativos; admin conforme contrato atual; colaborador somente após F20 e conforme direito específico.

A página precisa tratar carregamento, lista vazia, entrada inválida, sem permissão, conflito de versão quando houver mutação concorrente, falha recuperável e sucesso persistido. Uma ação não deve anunciar sucesso antes da confirmação do servidor. Não criar uma área de login alternativa.

## Reutilização verificada e lacuna concreta

- `backend/src/repositories/audit-logs-repository.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `backend/src/domain/state/transition.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `frontend/src/components/domain/panel.tsx`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.

Justificativa de evolução: Histórico de auditoria não substitui snapshots restauráveis; justificativa para modelo separado.

Antes de criar arquivo novo, localizar equivalente por responsabilidade e conferir exports/consumidores. Não copiar código para cumprir nome sugerido. Se reaproveitamento não couber, registrar lacuna concreta no ADR da feature e manter a dependência na direção domínio → porta, adapter implementando porta.

## Dados e invariantes

ProfileRevision imutável e publishedRevisionId; draft com versão otimista; snapshot só apresentação/links, nunca ACL/billing; perfil mínimo F09 já tem separação draft/published.

Proposta de migração: avaliar mudanças de schema e adicionar somente campos/tabelas/índices necessários ao contrato acima; validar tenantId, relações, unicidade e transações no PostgreSQL real; dado antigo permanece legível durante rollout. A spec de migração em S2 deve registrar backfill e validação antes de qualquer alteração destrutiva.

Regra transversal: IDs de outro tenant não podem ser aceitos em relações. Projeções públicas são allowlists; rascunhos, contatos, tokens e dados privados não entram por serialização automática. Dinheiro em centavos e tempo armazenado em UTC; a agregação de analytics existente mantém America/Sao_Paulo. Índices devem ser baseados em consulta real, sem plataforma de dados nova por padrão.

## Contratos propostos

Rotas/operações: GET /api/v1/me/profile/revisions; POST /revisions/:id/restore copia para novo draft; POST publish usa versão esperada.

**Entrada específica:** `revisionId,expectedDraftVersion; publish{expectedVersion}`.

**Saída específica:** `revisions[{id,createdAt,summary}],restoredDraft{version,validation}`.

Todos os caminhos são propostas a reconciliar com rotas atuais em S0; não estão implementados. Quando a rota abreviada omite prefixo, o prefixo é /api/v1. PATCH/POST/DELETE com sessão preservam CSRF do app e enviam host pelo BFF; tenant não vem do corpo. GET público não exige autenticação indevida. Exportações, tokens e respostas privadas usam política de cache que impeça exposição.

Erros: aplicar o envelope existente code/message/request_id; 400 para entrada inválida, 401 sem sessão em recurso privado, 403 para contexto de tenant incompatível quando contrato atual exige, 404 para recurso alheio/ausente sem enumerar dados, 409 para conflito de versão/identidade, 429 para limite, 503 para indisponibilidade externa quando apropriado. Rotas existentes podem ter semântica específica; preservar testes de contrato e documentar divergência antes de mudar.

## Interface e design

Compor controles locais e tokens em vez de introduzir biblioteca visual. O renderer público deve ser compartilhado com a prévia sempre que houver renderização de perfil. Nenhum template deve duplicar estrutura inteira de página. Novos textos e ações em português, com nomes acessíveis e foco preservado após erro.

Fluxo a desenhar em S0/S4: Ver versões, comparar campos relevantes, restaurar explicitamente para prévia e republicar.

Validar desktop 1280×720, mobile 390×844 e overflow em 320px; teclado e touch; labels e mensagens vinculadas ao campo; carregamento sem salto que esconda ações; estados vazios orientando próximo passo; erros sem apagar entrada válida. Capturar evidência visual na execução futura. Componentes novos só com responsabilidade explícita no plano.

## Critérios de aceitação da fonte

Cada linha preserva uma obrigação da fonte. Se um critério envolve decisão ainda pendente, resolver a decisão em S0 e adicionar valores/exemplos ao teste antes de implementá-lo. Nenhuma linha pode desaparecer por ser difícil de automatizar.

| Critério | Obrigação observável | Caso rastreável | Camada primária |
| --- | --- | --- | --- |
| F19-AC01 | salvar rascunho não altera a página pública | F19-T01 | I/PG |
| F19-AC02 | restaurar exige ação explícita | F19-T02 | I/PG |
| F19-AC03 | definir limites de retenção | F19-T03 | ADR + I/E |
| F19-AC04 | revalidar destinos restaurados. Histórico de apresentação não deve restaurar permissões, cobranças ou titularidade. | F19-T04 | I/PG |

## Cenários específicos e oráculos

Fixture comum: tenant A/B, dono A/outro dono A/admin A/dono B, IDs determinísticos por F19; T0 = 2026-10-14T12:00:00Z quando houver tempo. Acrescentar dados específicos abaixo sem alterar o seed global de outros testes.

### Unitários de domínio

- **F19-U01:** Restaurar cria novo draft, não sobrescreve público.
- **F19-U02:** destino revogado não reativa.
- **F19-U03:** versão velha causa conflito.
- **F19-U04:** ACL/assinatura atuais permanecem.

Cada cenário precisa criar a entrada e verificar o resultado descrito; usar relógio/RNG/porta injetável quando necessário. Restaurar mocks ao fim. Não mockar a própria regra que se pretende validar.

### Integração HTTP e persistência

- **F19-I01:** Duas publicações concorrentes => uma versão efetiva e conflito; restauração e revisão durável transacionais; retenção não apaga snapshot publicado.
- **F19-I02:** chamar operação privada como outro dono A e dono B; afirmar código de negação e ausência de mutação/retorno de dados de F19. Para leitura pública, afirmar apenas campos elegíveis, sem bloquear o visitante legítimo.
- **F19-I03:** repetir mutação ou evento aplicável e simular falha na fronteira de persistência/provedor; conferir invariantes, não apenas resposta. Se não houver mutação, repetir leitura/geração e comprovar ausência de efeitos.
- **F19-PG01:** validar constraints/consulta real descritas na seção Dados; quando não houver migração nova, testar isolamento e consulta sobre modelos existentes, sem migração artificial.

### Componentes

- **F19-C01:** renderizar a composição com dados válidos, vazios e falha; interagir com a ação principal de “Prévia e histórico de versões”; comprovar rótulos, resultado e ausência de envio duplicado.
- **F19-C02:** dado sensível/oculto na fixture de controle não pode entrar no texto, atributo ou link público. Se a feature só existe em painel privado, testar ausência de ações sem capacidade/permissão e confirmar que servidor também nega em I02.

### E2E Playwright

- **F19-E01:** Editar sem publicar e visitar anonimamente; restaurar versão anterior e conferir prévia; publicar e conferir público; outro dono não lê histórico.
- **F19-E02:** abrir a URL/ação privada por contexto sem sessão e por outro dono; checar negação real. Na superfície pública, inspecionar DOM e respostas de rede para ausência dos itens/segredos sentinela de controle.
- **F19-E03:** repetir a jornada principal no mobile; usar teclado para ação relevante; simular falha recuperável no adapter externo/harness ou desligamento de rede apropriado, conferir erro e recuperação sem sucesso falso. Não interceptar API interna para fingir persistência.

### Casos por critério original

Criar um teste com ID Tnn para cada AC, com o seguinte protocolo específico da feature: preparar a fixture descrita nos cenários U/I/E acima; executar a operação da seção Contratos que exercita o critério; afirmar exatamente o estado/valor/comportamento da linha do AC; quando a obrigação for negativa, introduzir o dado proibido na fixture e verificar sua ausência no estado, DTO e DOM aplicáveis. A matriz indica a camada primária; acrescentar PG/worker ou revisão manual quando a natureza exigir. A coluna de resultado permanece NÃO EXECUTADO até haver prova.





## Arquivos de teste propostos

- U: `backend/src/domain/profiles/historico-versoes.spec.ts`.
- C: `frontend/src/components/domain/historico-versoes.test.tsx`.
- I: `backend/src/http/historico-versoes.http.spec.ts`.
- PG: `backend/src/http/historico-versoes.pg.spec.ts`; registrar no comando/CI de PG.
- E: `frontend/e2e/historico-versoes.spec.ts`; registrar no projeto features e features-mobile antes de executar.
- Consumidores e novos caminhos sugeridos estão no plano; todos devem ser reconciliados com a árvore existente em S0.

## Decisões e condições de liberação

D21 retenção, máximo de versões e recuperação de mídia removida.

Risco específico: Histórico de auditoria não substitui snapshots restauráveis; justificativa para modelo separado.

Sem resolução das decisões bloqueantes e dependências concluídas, a feature não avança para implementação. Critério de saída: ACs com evidências, U/C/I/E relevantes verdes, PG/Redis quando exigidos, revisão de design e rollout/rollback aprovados. Seguir Definition of Done comum, sem marcar testes não executados como aprovados.

## Fonte integral da feature

**Objetivo:** permitir revisar mudanças antes de publicar e recuperar configurações anteriores.

**Escopo inicial:** rascunho separado da versão pública, prévia para celular e computador e restauração de versões publicadas.

**Critérios de conclusão:** salvar rascunho não altera a página pública; restaurar exige ação explícita; definir limites de retenção; revalidar destinos restaurados. Histórico de apresentação não deve restaurar permissões, cobranças ou titularidade.

**Indicadores:** uso da prévia e restaurações concluídas.


## Reconciliação de execução — 17/10/2026

[Execução F19](../execucao-f19.md) é o registro vigente de contratos, arquivos reais, decisões/alternativas, resultados e reversão. Prévia existente foi reutilizada; snapshots de publicações em ProfileRevision, 50/180 com preservação da atual; restauração explícita cria novo rascunho e revalida destinos. D21 mídia resolvida pelo usuário: não reter fotos antigas, omitir foto removida e avisar ao restaurar. Identidade, ACL e cobrança não são restauradas. Datas legadas são marcadas como importação. Publicação repetida conserva idempotência, criando um snapshot; restores concorrentes têm conflito.

Contratos reais: GET `/api/v1/me/profile/revisions`, GET `/api/v1/me/profile/revisions/:id` e POST `/api/v1/me/profile/revisions/:id/restore` com `{expectedVersion}`. Casos U/PG/C/E nos arquivos `profile-history.spec.ts`, `profile-history.pg.spec.ts`, `profile-history-screen.test.tsx`, `profile-comparison.test.ts` e `profile-history.spec.ts` do E2E. Comandos e evidências no registro; nomes e comandos propostos acima são históricos. Checklist futuro não substitui os gates efetivos registrados no ledger. S7 remoto permanece aberto, sem commit/push/deploy.
